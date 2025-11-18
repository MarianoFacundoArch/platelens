import axios from 'axios';
import { Request, Response } from 'express';

import { firestore } from '../lib/firebase';
import { detectFoodFromImage } from '../lib/openai';
import { mergeTotals } from '../lib/nutrition';
import { env } from '../lib/env';

export async function handleScan(req: Request, res: Response) {
  try {
    const { imageBase64, imageUrl, uid } = req.body ?? {};
    if (!imageBase64 && !imageUrl) {
      return res.status(400).json({ error: 'imageBase64 or imageUrl required' });
    }

    const base64 = imageBase64 ?? (await fetchAsBase64(imageUrl));

    const aiResult = await detectFoodFromImage(base64);
    // AI now provides complete nutrition data for each ingredient
    const items = aiResult.ingredientsList.map((ingredient) => ({
      name: ingredient.name,
      estimated_weight_g: ingredient.estimated_weight_g,
      portion_text: ingredient.portion_text,
      notes: ingredient.notes,
      calories: ingredient.calories,  // From AI
      macros: ingredient.macros,       // From AI
    }));

    const totals = mergeTotals(
      items.map(({ calories, macros }) => ({
        calories,
        p: macros.p,
        c: macros.c,
        f: macros.f,
      })),
    );

    const payload = {
      dishTitle: aiResult.dishTitle,
      items,
      totals,
      confidence: aiResult.confidence,
    };

    console.log('========================================');
    console.log('SCAN HANDLER - SENDING TO FRONTEND:');
    console.log('Dish Title:', payload.dishTitle);
    console.log('Number of items:', payload.items.length);
    console.log('Items:', JSON.stringify(payload.items.map(i => ({ name: i.name, calories: i.calories })), null, 2));
    console.log('Totals:', payload.totals);
    console.log('========================================');

    if (uid) {
      await firestore.collection('scans').doc().set({
        uid,
        createdAt: new Date().toISOString(),
        resultJSON: JSON.stringify(payload),
        confidence: aiResult.confidence,
        model: env.AI_MODEL || 'gpt-5',
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
