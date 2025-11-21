import { onDocumentWritten } from 'firebase-functions/v2/firestore';

import { firestore, storage } from '../lib/firebase';
import { detectFoodFromImage, detectFoodFromText } from '../lib/openai';
import { ensureIngredientAndJob } from '../lib/ingredients';
import { mergeTotals } from '../lib/nutrition';
import type { ScanJobDoc, LogDoc } from '../shared/types/firestore';

export const processScanJob = onDocumentWritten(
  'scan_jobs/{scanId}',
  async (event) => {
    const scanId = event.params.scanId as string;
    const before = event.data?.before?.data() as ScanJobDoc | undefined;
    const after = event.data?.after?.data() as ScanJobDoc | undefined;

    if (!after) {
      return;
    }

    // Only process transitions into queued
    if (after.status !== 'queued' || before?.status === 'queued') {
      return;
    }

    const now = new Date().toISOString();
    const jobRef = firestore.collection('scan_jobs').doc(scanId);

    // Transition to processing with a transaction to avoid duplicate work
    const transitioned = await firestore.runTransaction(async (tx) => {
      const snap = await tx.get(jobRef);
      if (!snap.exists) return false;
      const data = snap.data() as ScanJobDoc;
      if (data.status !== 'queued') return false;

      tx.set(
        jobRef,
        {
          status: 'processing',
          updatedAt: now,
          attempts: (data.attempts ?? 0) + 1,
        },
        { merge: true }
      );

      return true;
    });

    if (!transitioned) {
      return;
    }

    const jobSnap = await jobRef.get();
    const job = jobSnap.data() as ScanJobDoc | undefined;
    if (!job) {
      return;
    }

    const mealId = job.mealId;
    const mealRef = mealId ? firestore.collection('logs').doc(mealId) : null;

    try {
      if (job.status !== 'processing') {
        return;
      }

      // Bail if meal was cancelled/removed
      if (mealRef) {
        const mealSnap = await mealRef.get();
        if (!mealSnap.exists) {
          await jobRef.set(
            {
              status: 'cancelled',
              updatedAt: now,
              error: 'Meal deleted before scan finished',
            },
            { merge: true }
          );
          return;
        }
        const meal = mealSnap.data() as LogDoc;
        if (meal.status === 'cancelled') {
          await jobRef.set(
            { status: 'cancelled', updatedAt: now, error: 'Meal cancelled' },
            { merge: true }
          );
          return;
        }
      }

      let aiResult: Awaited<ReturnType<typeof detectFoodFromImage>> | Awaited<ReturnType<typeof detectFoodFromText>>;

      if (job.source === 'text') {
        if (!job.textDescription) {
          throw new Error('Missing textDescription for text scan');
        }
        aiResult = await detectFoodFromText(job.textDescription);
      } else {
        if (!job.storagePath) {
          throw new Error('Missing storagePath for photo scan');
        }

        const bucket = storage.bucket();
        const [buffer] = await bucket.file(job.storagePath).download();
        const base64 = buffer.toString('base64');

        aiResult = await detectFoodFromImage(base64);
      }

      const enrichedIngredients = await Promise.all(
        aiResult.ingredientsList.map(async (ingredient) => {
          const ensured = await ensureIngredientAndJob(ingredient.name);
          return {
            ...ingredient,
            id: ensured.id,
          };
        })
      );

      const totals = mergeTotals(
        enrichedIngredients.map(({ calories, macros }) => ({
          calories,
          p: macros.p,
          c: macros.c,
          f: macros.f,
        })),
      );

      if (mealRef) {
        await mealRef.set(
          {
            status: 'ready',
            dishTitle: aiResult.dishTitle,
            ingredientsList: enrichedIngredients,
            totalCalories: totals.calories,
            macros: totals,
            confidence: aiResult.confidence,
            scanId,
            ...(job.storagePath ? { imageStoragePath: job.storagePath } : {}),
            updatedAt: now,
          } as Partial<LogDoc>,
          { merge: true }
        );
      }

      await jobRef.set(
        {
          status: 'done',
          updatedAt: now,
          error: '',
        },
        { merge: true }
      );
    } catch (error: any) {
      const message = error?.message || String(error);
      console.error('[processScanJob] Failed', { scanId, error: message });

      await jobRef.set(
        {
          status: 'failed',
          updatedAt: now,
          error: message.slice(0, 500),
        },
        { merge: true }
      );
    }
  }
);
