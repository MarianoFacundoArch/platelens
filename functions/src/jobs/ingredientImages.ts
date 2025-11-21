import { onDocumentWritten } from 'firebase-functions/v2/firestore';

import crypto from 'crypto';

import { firestore, storage } from '../lib/firebase';
import { deriveIngredientIdentity, slugifyForIngredient } from '../lib/slug';
import { generateIngredientImage } from '../lib/openai';
import { IngredientDoc, ImageJobDoc } from '../shared/types/firestore';

const JOBS_COLLECTION = 'image_jobs';
const INGREDIENTS_COLLECTION = 'ingredients';
const toWebpPath = (path: string) => {
  if (path.toLowerCase().endsWith('.webp')) return path;
  if (path.toLowerCase().endsWith('.png')) return path.slice(0, -4) + '.webp';
  return `${path}.webp`;
};

export const processIngredientImageJob = onDocumentWritten(
  `${JOBS_COLLECTION}/{ingredientId}`,
  async event => {
    const after = event.data?.after?.data() as ImageJobDoc | undefined;
    const before = event.data?.before?.data() as ImageJobDoc | undefined;
    const ingredientId = event.params.ingredientId as string;

    if (!after) {
      return;
    }

    // Only act on transitions into queued
    if (after.status !== 'queued' || before?.status === 'queued') {
      return;
    }

    const now = new Date().toISOString();
    const jobRef = firestore.collection(JOBS_COLLECTION).doc(ingredientId);
    const ingredientRef = firestore.collection(INGREDIENTS_COLLECTION).doc(ingredientId);

    const transitioned = await firestore.runTransaction(async tx => {
      const jobSnap = await tx.get(jobRef);
      if (!jobSnap.exists) return false;
      const jobData = jobSnap.data() as ImageJobDoc;
      if (jobData.status !== 'queued') return false;

      tx.set(
        jobRef,
        {
          status: 'generating',
          updatedAt: now,
          attempts: (jobData.attempts ?? 0) + 1,
          error: '',
        },
        { merge: true }
      );

      tx.set(
        ingredientRef,
        {
          imageStatus: 'generating',
          updatedAt: now,
        },
        { merge: true }
      );

      return true;
    });

    if (!transitioned) {
      return;
    }

    const ingredientSnap = await ingredientRef.get();
    if (!ingredientSnap.exists) {
      await jobRef.set(
        { status: 'failed', error: 'Ingredient doc missing', updatedAt: now },
        { merge: true }
      );
      return;
    }

    const ingredient = ingredientSnap.data() as IngredientDoc;
    const displayName = ingredient.displayName || ingredient.canonicalName || 'ingredient';
    const identity = deriveIngredientIdentity(ingredient.canonicalName || displayName);
    const { filename } = slugifyForIngredient(identity.canonicalName, ingredientId);
    let storagePath = ingredient.storagePath || filename;

    console.log('[IngredientImageJob] Generating image', {
      ingredientId,
      displayName,
      storagePath,
    });

    try {
      const b64 = await generateIngredientImage(displayName);
      const buffer = Buffer.from(b64, 'base64');
      const bucket = storage.bucket();
      let targetPath = storagePath;
      let contentType: 'image/png' | 'image/webp' = 'image/png';
      let outputBuffer = buffer;

      let sharp: any = null;
      try {
        // Optional dependency to shrink/convert. Falls back to original PNG if missing.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        sharp = require('sharp');
      } catch (err: any) {
        console.warn('[IngredientImageJob] sharp not available, storing original PNG', err?.message);
      }

      if (sharp) {
        targetPath = toWebpPath(storagePath);
        outputBuffer = await sharp(buffer).resize(512, 512, { fit: 'cover' }).webp({ quality: 80 }).toBuffer();
        contentType = 'image/webp';
      } else if (targetPath.toLowerCase().endsWith('.webp')) {
        targetPath = targetPath.replace(/\.webp$/i, '.png');
      }

      const file = bucket.file(targetPath);
      const downloadToken = crypto.randomUUID();

      await file.save(outputBuffer, {
        contentType,
        metadata: {
          cacheControl: 'public,max-age=31536000,immutable',
          metadata: {
            firebaseStorageDownloadTokens: downloadToken,
          },
        },
      });

      const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(
        targetPath
      )}?alt=media&token=${downloadToken}`;

      await Promise.all([
        ingredientRef.set(
          {
            imageUrl,
            storagePath: targetPath,
            downloadToken,
            slug: ingredient.slug || identity.slug,
            imageStatus: 'ready',
            lastGeneratedAt: now,
            updatedAt: now,
          },
          { merge: true }
        ),
        jobRef.set(
          {
            status: 'ready',
            updatedAt: now,
            error: '',
          },
          { merge: true }
        ),
      ]);

      console.log('[IngredientImageJob] Image generated', { ingredientId, storagePath });
    } catch (error: any) {
      const message = error?.message || String(error);
      console.error('[IngredientImageJob] Failed', { ingredientId, error: message });
      await Promise.all([
        ingredientRef.set(
          {
            imageStatus: 'failed',
            updatedAt: now,
          },
          { merge: true }
        ),
        jobRef.set(
          { status: 'failed', updatedAt: now, error: message.slice(0, 500) },
          { merge: true }
        ),
      ]);
    }
  }
);
