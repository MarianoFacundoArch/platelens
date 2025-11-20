import axios from 'axios';
import { Request, Response } from 'express';

import { firestore } from '../lib/firebase';
import { detectFoodFromImage, detectFoodFromText } from '../lib/openai';
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

    // AI provides complete nutrition data with ingredientsList
    const totals = mergeTotals(
      aiResult.ingredientsList.map(({ calories, macros }) => ({
        calories,
        p: macros.p,
        c: macros.c,
        f: macros.f,
      })),
    );

    const payload = {
      dishTitle: aiResult.dishTitle,
      ingredientsList: aiResult.ingredientsList,
      totals,
      confidence: aiResult.confidence,
    };

    console.log('========================================');
    console.log('SCAN HANDLER - SENDING TO FRONTEND:');
    console.log('Dish Title:', payload.dishTitle);
    console.log('Number of ingredients:', payload.ingredientsList.length);
    console.log('Ingredients:', JSON.stringify(payload.ingredientsList.map(i => ({ name: i.name, calories: i.calories })), null, 2));
    console.log('Totals:', payload.totals);
    console.log('========================================');

    if (uid) {
      await firestore.collection('scans').doc().set({
        uid,
        createdAt: new Date().toISOString(),
        resultJSON: JSON.stringify(payload),
        confidence: aiResult.confidence,
        model: env.AI_MODEL || 'gpt-5',
        tokensUsed: aiResult.ingredientsList.length * 30,
        costEstimateUsd: +(aiResult.ingredientsList.length * 0.002).toFixed(4),
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

export async function handleTextScan(req: Request, res: Response) {
  try {
    const { description, uid } = req.body ?? {};
    if (!description) {
      return res.status(400).json({ error: 'description required' });
    }

    const aiResult = await detectFoodFromText(description);

    // AI provides complete nutrition data with ingredientsList (same as image scan)
    const totals = mergeTotals(
      aiResult.ingredientsList.map(({ calories, macros }) => ({
        calories,
        p: macros.p,
        c: macros.c,
        f: macros.f,
      })),
    );

    const payload = {
      dishTitle: aiResult.dishTitle,
      ingredientsList: aiResult.ingredientsList,
      totals,
      confidence: aiResult.confidence,
    };

    console.log('========================================');
    console.log('TEXT SCAN HANDLER - SENDING TO FRONTEND:');
    console.log('Dish Title:', payload.dishTitle);
    console.log('Number of ingredients:', payload.ingredientsList.length);
    console.log('Ingredients:', JSON.stringify(payload.ingredientsList.map(i => ({ name: i.name, calories: i.calories })), null, 2));
    console.log('Totals:', payload.totals);
    console.log('========================================');

    if (uid) {
      await firestore.collection('scans').doc().set({
        uid,
        createdAt: new Date().toISOString(),
        resultJSON: JSON.stringify(payload),
        confidence: aiResult.confidence,
        model: env.AI_MODEL || 'gpt-5',
        tokensUsed: aiResult.ingredientsList.length * 25, // Text typically uses fewer tokens
        costEstimateUsd: +(aiResult.ingredientsList.length * 0.0015).toFixed(4),
        method: 'text', // Track that this was a text-based scan
      });
    }

    return res.json(payload);
  } catch (error) {
    console.error('text-scan-handler', error);
    return res.status(500).json({ error: 'Failed to process text scan' });
  }
}
