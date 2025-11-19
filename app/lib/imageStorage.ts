import { Directory, File, Paths } from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

// Local copies are just for caching - clean up after 1 hour
// The real images are stored in Firebase Storage permanently
const MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

/**
 * Get or create the scans directory
 */
function getScansDirectory(): Directory {
  // Create directory reference in documents/scans
  const scansDir = new Directory(Paths.document, 'scans');

  // Create directory if it doesn't exist (synchronous in new API)
  if (!scansDir.exists) {
    scansDir.create();
  }

  return scansDir;
}

/**
 * Compress and save scan image locally only
 * Does NOT upload to cloud yet - upload happens after meal is created
 * Returns the local file URI for temporary storage
 */
export async function saveCompressedScan(sourceUri: string): Promise<string> {
  try {
    // Compress image to WebP format (25-35% smaller than JPEG at same quality)
    const manipResult = await ImageManipulator.manipulateAsync(
      sourceUri,
      [{ resize: { width: 768 } }], // Maintains aspect ratio
      { compress: 0.75, format: ImageManipulator.SaveFormat.WEBP }
    );

    // Save locally for temporary storage until meal is created
    const scansDir = getScansDirectory();
    const timestamp = Date.now();
    const localFilename = `scan_${timestamp}.webp`;
    const scanFile = new File(scansDir, localFilename);
    const sourceFile = new File(manipResult.uri);
    sourceFile.copy(scanFile);

    console.log(`Saved compressed image locally: ${localFilename}`);
    return scanFile.uri;
  } catch (error) {
    console.error('Failed to save compressed scan:', error);
    throw error;
  }
}

/**
 * Upload an image to Firebase Storage using the meal ID as filename
 * This prevents collisions and links images to their meals
 *
 * ⚠️ PRODUCTION TODO: Update Firebase Storage rules to require authentication
 * See TOPRODUCTION.txt for details
 */
export async function uploadMealImage(localImageUri: string, mealId: string): Promise<string> {
  try {
    // Convert local file to blob
    const response = await fetch(localImageUri);
    const blob = await response.blob();

    // Upload to Firebase Storage with meal ID as filename
    const filename = `meal-images/${mealId}.webp`;
    const storageRef = ref(storage, filename);

    console.log(`Uploading meal image to Firebase Storage: ${filename}`);
    await uploadBytes(storageRef, blob);

    // Get the download URL
    const downloadURL = await getDownloadURL(storageRef);
    console.log(`Meal image uploaded successfully: ${downloadURL}`);

    return downloadURL;
  } catch (error) {
    console.error('Failed to upload meal image to cloud:', error);
    throw error;
  }
}

/**
 * Delete a meal image from Firebase Storage
 * Uses meal ID to construct the filename
 *
 * Note: In production, image deletion happens automatically in the backend
 * when a meal is deleted. This function is provided for manual cleanup or future features.
 */
export async function deleteMealImage(mealId: string): Promise<void> {
  try {
    const filename = `meal-images/${mealId}.webp`;
    const storageRef = ref(storage, filename);

    await deleteObject(storageRef);
    console.log(`Deleted meal image: ${filename}`);
  } catch (error) {
    console.error('Failed to delete meal image:', error);
    throw error;
  }
}

/**
 * Get the latest scan image URI from cache
 * Returns null if not found
 */
export function getLatestScanImage(): string | null {
  // This will be read from the mmkv cache in the calling component
  // Keeping this function for consistency and future extension
  return null;
}

/**
 * Clean up local image cache older than 1 hour
 * Images are permanently stored in Firebase Storage, so local copies are just temporary cache
 * Run on app start and before capturing new photos
 */
export function cleanupOldScans(): void {
  try {
    const scansDir = getScansDirectory();

    // Check if directory exists
    if (!scansDir.exists) {
      return;
    }

    // List all files in the directory (synchronous in new API)
    const files = scansDir.list();
    const now = Date.now();
    let deletedCount = 0;

    for (const item of files) {
      // Only process files, not subdirectories
      if (item instanceof File) {
        const file = item as File;

        // Check modification time
        if (file.modificationTime) {
          const age = now - file.modificationTime;
          if (age > MAX_AGE_MS) {
            file.delete();
            deletedCount++;
          }
        }
      }
    }

    if (deletedCount > 0) {
      console.log(`Cleaned up ${deletedCount} old scan images`);
    }
  } catch (error) {
    console.warn('Cleanup failed:', error);
  }
}

/**
 * Delete a specific scan image by URI
 */
export function deleteSpecificScan(uri: string): void {
  try {
    const file = new File(uri);
    if (file.exists) {
      file.delete();
      console.log(`Deleted scan: ${uri}`);
    }
  } catch (error) {
    console.warn('Failed to delete scan:', error);
  }
}
