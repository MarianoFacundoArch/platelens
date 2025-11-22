import { firestore } from "./firebase";
import { deriveIngredientIdentity } from "./slug";
import { IngredientDoc, ImageJobDoc } from "../shared/types/firestore";

const INGREDIENTS_COLLECTION = "ingredients";
const JOBS_COLLECTION = "image_jobs";

type EnsureResult = {
  id: string;
  canonicalName: string;
  slug: string;
  imageUrl?: string;
};

/**
 * Upsert ingredient metadata and enqueue an image job if needed.
 * Idempotent: will not double-queue if a job is already queued/generating.
 */
export async function ensureIngredientAndJob(
  rawName: string
): Promise<EnsureResult> {
  const { id, canonicalName, slug } = deriveIngredientIdentity(rawName);
  const now = new Date().toISOString();

  const ingredientRef = firestore.collection(INGREDIENTS_COLLECTION).doc(id);
  const jobRef = firestore.collection(JOBS_COLLECTION).doc(id);

  let imageUrl: string | undefined;

  await firestore.runTransaction(async (tx) => {
    const [ingredientSnap, jobSnap] = await Promise.all([
      tx.get(ingredientRef),
      tx.get(jobRef),
    ]);

    const ingredientData = ingredientSnap.exists
      ? (ingredientSnap.data() as IngredientDoc)
      : undefined;
    const jobData = jobSnap.exists
      ? (jobSnap.data() as ImageJobDoc)
      : undefined;

    imageUrl = ingredientData?.imageUrl;
    const hasImage = !!ingredientData?.imageUrl;
    const jobStatus = jobData?.status;

    const shouldQueue =
      !hasImage && !["queued", "generating"].includes(jobStatus ?? "");

    const ingredientUpdate: Partial<IngredientDoc> = {
      displayName: rawName,
      canonicalName,
      slug,
      updatedAt: now,
      createdAt: ingredientData?.createdAt ?? now,
    };

    if (
      shouldQueue &&
      ingredientData?.imageStatus !== "queued" &&
      ingredientData?.imageStatus !== "generating"
    ) {
      ingredientUpdate.imageStatus = "queued";
    }

    tx.set(ingredientRef, ingredientUpdate, { merge: true });

    if (shouldQueue) {
      tx.set(
        jobRef,
        {
          status: "queued",
          attempts: jobData?.attempts ?? 0,
          error: "",
          updatedAt: now,
        },
        { merge: true }
      );
    }
  });

  return { id, canonicalName, slug, imageUrl };
}
