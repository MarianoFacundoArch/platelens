import { Request, Response } from 'express';
import { firestore, storage } from '../lib/firebase';
import type { LogDoc } from '../shared/types/firestore';

const ISO_DATE_LENGTH = 10; // YYYY-MM-DD

function formatDateISO(date: Date) {
  return date.toISOString().split('T')[0];
}

function normalizeDate(input?: string) {
  if (input && input.length >= ISO_DATE_LENGTH) {
    const parsed = new Date(input);
    if (!Number.isNaN(parsed.getTime())) {
      return formatDateISO(parsed);
    }
  }
  return formatDateISO(new Date());
}

async function getMealsForDate(uid: string, dateISO: string) {
  const snapshot = await firestore
    .collection('logs')
    .where('uid', '==', uid)
    .where('dateISO', '==', dateISO)
    .orderBy('createdAt', 'desc')
    .get();

  const logs = snapshot.docs.map((doc) => {
    const data = doc.data() as LogDoc;
    return { ...data, id: doc.id };
  });

  const totals = logs.reduce(
    (acc, log) => ({
      calories: acc.calories + (log.totalCalories ?? 0),
      p: acc.p + (log.macros?.p ?? 0),
      c: acc.c + (log.macros?.c ?? 0),
      f: acc.f + (log.macros?.f ?? 0),
    }),
    { calories: 0, p: 0, c: 0, f: 0 },
  );

  return { logs, totals, dateISO };
}

export async function saveMeal(req: Request, res: Response) {
  try {
    const {
      uid,
      dishTitle,
      ingredientsList,
      totals,
      confidence,
      photoId,
      imageUri,
      mealType,
      portionMultiplier,
    } = req.body ?? {};

    if (!uid || !ingredientsList || !totals) {
      return res.status(400).json({ error: 'uid, ingredientsList, and totals are required' });
    }

    // Get today's date in ISO format (YYYY-MM-DD)
    const now = new Date();
    const dateISO = now.toISOString().split('T')[0];
    const createdAt = now.toISOString();

    // Create the log document
    const logRef = firestore.collection('logs').doc();
    const logDoc: LogDoc = {
      id: logRef.id,
      uid,
      dateISO,
      createdAt,
      ...(dishTitle && { dishTitle }), // Include dish title if provided
      ingredientsList: ingredientsList.map((ingredient: any) => ({
        name: ingredient.name,
        estimated_weight_g: ingredient.estimated_weight_g,
        calories: ingredient.calories,
        macros: ingredient.macros,
        notes: ingredient.notes || '',
      })),
      totalCalories: totals.calories,
      macros: {
        p: totals.p,
        c: totals.c,
        f: totals.f,
      },
      source: {
        ...(photoId && { photoId }), // Only include photoId if it exists
        method: 'camera',
      },
      ...(imageUri && { imageUri }), // Only include if provided
      confidence: confidence || 0.8,
      ...(mealType && { mealType }), // Only include if provided
      ...(portionMultiplier !== undefined && { portionMultiplier }), // Only include if provided
    };

    await logRef.set(logDoc);

    // Update user's last log date and streak
    const userRef = firestore.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (userDoc.exists) {
      const userData = userDoc.data();
      const lastLogDate = userData?.lastLogDate;
      let streakCount = userData?.streakCount || 0;

      // Check if this is a new day
      if (lastLogDate !== dateISO) {
        // Check if streak should continue (logged yesterday)
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayISO = yesterday.toISOString().split('T')[0];

        if (lastLogDate === yesterdayISO) {
          streakCount += 1;
        } else if (!lastLogDate) {
          streakCount = 1;
        } else {
          // Streak broken
          streakCount = 1;
        }

        await userRef.update({
          lastLogDate: dateISO,
          streakCount,
        });
      }
    }

    return res.json({
      success: true,
      logId: logRef.id,
      dateISO,
    });
  } catch (error) {
    console.error('save-meal-handler', error);
    return res.status(500).json({ error: 'Failed to save meal' });
  }
}

export async function getTodaysMeals(req: Request, res: Response) {
  try {
    const uid = req.query.uid as string | undefined;
    const requestedDate = req.query.dateISO as string | undefined;

    if (!uid) {
      return res.status(400).json({ error: 'uid is required' });
    }

    const dateISO = normalizeDate(requestedDate);
    const result = await getMealsForDate(uid, dateISO);

    return res.json(result);
  } catch (error) {
    console.error('get-todays-meals-handler', error);
    return res.status(500).json({ error: 'Failed to get meals' });
  }
}

export async function getMealHistory(req: Request, res: Response) {
  try {
    const uid = req.query.uid as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    if (!uid) {
      return res.status(400).json({ error: 'uid is required' });
    }

    const endDateISO = normalizeDate(endDate);
    const resolvedEndDate = new Date(endDateISO);
    const startSeed = startDate ? new Date(startDate) : new Date(resolvedEndDate);
    startSeed.setDate(startSeed.getDate() - 6); // Default to last 7 days
    const startDateISO = normalizeDate(startDate ?? formatDateISO(startSeed));

    const historySnapshot = await firestore
      .collection('logs')
      .where('uid', '==', uid)
      .where('dateISO', '>=', startDateISO)
      .where('dateISO', '<=', endDateISO)
      .orderBy('dateISO')
      .get();

    const dayTotals: Record<
      string,
      { calories: number; p: number; c: number; f: number; logCount: number }
    > = {};

    historySnapshot.docs.forEach((doc) => {
      const data = doc.data() as LogDoc;
      const key = data.dateISO;
      const existing = dayTotals[key] || { calories: 0, p: 0, c: 0, f: 0, logCount: 0 };
      dayTotals[key] = {
        calories: existing.calories + (data.totalCalories ?? 0),
        p: existing.p + (data.macros?.p ?? 0),
        c: existing.c + (data.macros?.c ?? 0),
        f: existing.f + (data.macros?.f ?? 0),
        logCount: existing.logCount + 1,
      };
    });

    const days: Array<{
      dateISO: string;
      totals: { calories: number; p: number; c: number; f: number };
      logCount: number;
    }> = [];

    const cursor = new Date(startDateISO);
    while (cursor <= resolvedEndDate) {
      const iso = formatDateISO(cursor);
      const totals = dayTotals[iso] ?? { calories: 0, p: 0, c: 0, f: 0, logCount: 0 };
      days.push({
        dateISO: iso,
        totals: { calories: totals.calories, p: totals.p, c: totals.c, f: totals.f },
        logCount: totals.logCount,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    return res.json({
      startDate: startDateISO,
      endDate: endDateISO,
      days,
    });
  } catch (error) {
    console.error('get-meal-history-handler', error);
    return res.status(500).json({ error: 'Failed to get meal history' });
  }
}

export async function updateMeal(req: Request, res: Response) {
  try {
    console.log('[updateMeal] Request body:', JSON.stringify(req.body, null, 2));
    const { uid, mealId, portionMultiplier, mealType, imageUri } = req.body ?? {};

    console.log('[updateMeal] Extracted values:', { uid, mealId, portionMultiplier, mealType, imageUri });

    if (!uid || !mealId) {
      console.log('[updateMeal] Missing required fields:', { uid, mealId });
      return res.status(400).json({ error: 'uid and mealId are required' });
    }

    // Get the meal document by Firestore document ID
    console.log('[updateMeal] Fetching document from collection "logs" with ID:', mealId);
    const mealRef = firestore.collection('logs').doc(mealId);
    const mealDoc = await mealRef.get();

    console.log('[updateMeal] Document exists:', mealDoc.exists);

    if (!mealDoc.exists) {
      console.log('[updateMeal] Document not found in Firestore for ID:', mealId);
      return res.status(404).json({ error: 'Meal not found' });
    }

    const mealData = mealDoc.data() as LogDoc;

    // Verify ownership
    if (mealData.uid !== uid) {
      return res.status(403).json({ error: 'Not authorized to update this meal' });
    }

    // Build update object
    const updates: Partial<LogDoc> = {};

    if (portionMultiplier !== undefined) {
      // Recalculate calories and macros based on new portion
      const baseMultiplier = mealData.portionMultiplier || 1.0;
      const multiplierChange = portionMultiplier / baseMultiplier;

      updates.portionMultiplier = portionMultiplier;
      updates.totalCalories = mealData.totalCalories * multiplierChange;
      updates.macros = {
        p: mealData.macros.p * multiplierChange,
        c: mealData.macros.c * multiplierChange,
        f: mealData.macros.f * multiplierChange,
      };

      // Update ingredients list with new portions
      const ingredientsList = mealData.ingredientsList || [];
      updates.ingredientsList = ingredientsList.map((ingredient) => ({
        ...ingredient,
        calories: ingredient.calories * multiplierChange,
        macros: {
          p: ingredient.macros.p * multiplierChange,
          c: ingredient.macros.c * multiplierChange,
          f: ingredient.macros.f * multiplierChange,
        },
      }));
    }

    if (mealType !== undefined) {
      updates.mealType = mealType;
    }

    if (imageUri !== undefined) {
      updates.imageUri = imageUri;
    }

    // Update the document
    await mealRef.update(updates);

    return res.json({
      success: true,
      mealId,
      updates,
    });
  } catch (error) {
    console.error('update-meal-handler', error);
    return res.status(500).json({ error: 'Failed to update meal' });
  }
}

export async function deleteMeal(req: Request, res: Response) {
  try {
    const { uid, mealId } = req.body ?? {};

    if (!uid || !mealId) {
      return res.status(400).json({ error: 'uid and mealId are required' });
    }

    // Get the meal document
    const mealRef = firestore.collection('logs').doc(mealId);
    const mealDoc = await mealRef.get();

    if (!mealDoc.exists) {
      return res.status(404).json({ error: 'Meal not found' });
    }

    const mealData = mealDoc.data() as LogDoc;

    // Verify ownership
    if (mealData.uid !== uid) {
      return res.status(403).json({ error: 'Not authorized to delete this meal' });
    }

    // Delete the associated image from Firebase Storage if it exists
    if (mealData.imageUri) {
      try {
        const filename = `meal-images/${mealId}.webp`;
        await storage.bucket().file(filename).delete();
        console.log(`Deleted meal image: ${filename}`);
      } catch (imageError) {
        // Log but don't fail the meal deletion if image deletion fails
        console.warn('Failed to delete meal image (continuing with meal deletion):', imageError);
      }
    }

    // Delete the meal document
    await mealRef.delete();

    return res.json({
      success: true,
      mealId,
    });
  } catch (error) {
    console.error('delete-meal-handler', error);
    return res.status(500).json({ error: 'Failed to delete meal' });
  }
}
