import axios from 'axios';
import crypto from 'crypto';
import { Request, Response } from 'express';

import { firestore } from '../lib/firebase';
import { detectFoodFromImage } from '../lib/openai';
import { estimateItem, mergeTotals } from '../lib/nutrition';

export async function handleScan(req: Request, res: Response) {
  try {
    const { imageBase64, imageUrl, uid } = req.body ?? {};
    if (!imageBase64 && !imageUrl) {
      return res.status(400).json({ error: 'imageBase64 or imageUrl required' });
    }

    const base64 = imageBase64 ?? (await fetchAsBase64(imageUrl));
    const phash = pseudoHash(base64);

    const duplicateSnapshot = await firestore
      .collection('photos')
      .where('perceptualHash', '==', phash)
      .where('uid', '==', uid ?? null)
      .limit(1)
      .get();

    if (!duplicateSnapshot.empty) {
      const existing = duplicateSnapshot.docs[0].data();
      return res.json({
        ...existing.lastScanResult,
        dedupedFromPhotoId: duplicateSnapshot.docs[0].id,
      });
    }

    const aiResult = await detectFoodFromImage(base64);
    const items = aiResult.items.map((item) => {
      const nutrition = estimateItem(item.name, item.estimated_weight_g);
      return {
        name: item.name,
        estimated_weight_g: item.estimated_weight_g,
        portion_text: item.portion_text,
        notes: item.notes,
        calories: nutrition.calories,
        macros: nutrition.macros,
      };
    });

    const totals = mergeTotals(
      items.map(({ calories, macros }) => ({
        calories,
        p: macros.p,
        c: macros.c,
        f: macros.f,
      })),
    );

    const payload = {
      items,
      totals,
      confidence: aiResult.confidence,
    };

    if (uid) {
      const photoRef = firestore.collection('photos').doc();
      await photoRef.set({
        id: photoRef.id,
        uid,
        perceptualHash: phash,
        createdAt: new Date().toISOString(),
        lastScanResult: payload,
      });
      await firestore.collection('scans').doc().set({
        uid,
        createdAt: new Date().toISOString(),
        resultJSON: JSON.stringify(payload),
        confidence: aiResult.confidence,
        model: 'gpt-4o-mini',
        tokensUsed: items.length * 30,
        costEstimateUsd: +(items.length * 0.002).toFixed(4),
      });
    }

    return res.json(payload);
  } catch (error) {
    console.error('scan-handler', error);
    return res.status(500).json({ error: 'Failed to process scan' });
  }
}

async function fetchAsBase64(url: string): Promise<string> {
  const response = await axios.get<ArrayBuffer>(url, { responseType: 'arraybuffer' });
  return Buffer.from(response.data).toString('base64');
}

function pseudoHash(input: string): string {
  return crypto.createHash('sha1').update(input).digest('hex');
}
