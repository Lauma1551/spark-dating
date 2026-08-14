import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const MAX_PHOTO_COUNT = 6;
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB limit

/**
 * Resizes and compresses an image file on the client before upload.
 * Returns a Blob ready for Firebase Storage or data URL fallback.
 */
export async function compressImage(file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        // Fallback to original file
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            resolve(file);
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = (err) => reject(err);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Convert a File/Blob to a Base64 Data URL (useful for immediate preview & resilient fallback).
 */
export function fileToDataUrl(fileOrBlob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(fileOrBlob);
  });
}

/**
 * Uploads a profile photo to Firebase Storage under `users/{uid}/photos/`.
 * Falls back safely to high-quality compressed Base64 data URL if storage upload encounters bucket permission blocks.
 */
export async function uploadProfilePhoto(uid: string, file: File, slotName = 'photo'): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please select an image file (JPEG, PNG, WEBP).');
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('Image size must be less than 5MB.');
  }

  // Compress image client-side first
  const compressedBlob = await compressImage(file);

  try {
    const timestamp = Date.now();
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storageRef = ref(storage, `users/${uid}/photos/${slotName}_${timestamp}_${safeFileName}`);
    
    // Upload bytes to Firebase Storage
    const snapshot = await uploadBytes(storageRef, compressedBlob, {
      contentType: 'image/jpeg',
      customMetadata: {
        ownerUid: uid,
        uploadedAt: new Date().toISOString()
      }
    });

    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
  } catch (storageError) {
    console.warn('Firebase Storage upload encountered an issue, falling back to secure data URL:', storageError);
    // Graceful fallback so user is never blocked
    const fallbackDataUrl = await fileToDataUrl(compressedBlob);
    return fallbackDataUrl;
  }
}

/**
 * Calculate age accurately from date of birth (YYYY-MM-DD string or Date).
 */
export function calculateAge(dobString: string): number {
  if (!dobString) return 0;
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) return 0;

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  return age;
}
