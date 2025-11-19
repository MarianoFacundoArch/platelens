import { Request, Response } from 'express';
import { firestore } from '../lib/firebase';
import type { LogDoc } from '../shared/types/firestore';

export async function saveMeal(req: Request, res: Response) {
  try {
    const {
      uid,
      dishTitle,
      ingredientsList,
      totals,
      confidence,
      photoId,
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
    const { uid } = req.query;

    if (!uid) {
      return res.status(400).json({ error: 'uid is required' });
    }

    // Get today's date
    const dateISO = new Date().toISOString().split('T')[0];

    // Query logs for today
    const logsSnapshot = await firestore
      .collection('logs')
      .where('uid', '==', uid)
      .where('dateISO', '==', dateISO)
      .orderBy('createdAt', 'desc')
      .get();

    const logs = logsSnapshot.docs.map((doc) => {
      const data = doc.data() as LogDoc;
      // Ensure we use the Firestore document ID, not any ID from the data
      return { ...data, id: doc.id };
    });

    // Calculate totals
    const totals = logs.reduce(
      (acc, log) => ({
        calories: acc.calories + log.totalCalories,
        p: acc.p + log.macros.p,
        c: acc.c + log.macros.c,
        f: acc.f + log.macros.f,
      }),
      { calories: 0, p: 0, c: 0, f: 0 },
    );

    return res.json({
      logs,
      totals,
      dateISO,
    });
  } catch (error) {
    console.error('get-todays-meals-handler', error);
    return res.status(500).json({ error: 'Failed to get meals' });
  }
}

export async function updateMeal(req: Request, res: Response) {
  try {
    console.log('[updateMeal] Request body:', JSON.stringify(req.body, null, 2));
    const { uid, mealId, portionMultiplier, mealType } = req.body ?? {};

    console.log('[updateMeal] Extracted values:', { uid, mealId, portionMultiplier, mealType });

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

    // Delete the meal
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
