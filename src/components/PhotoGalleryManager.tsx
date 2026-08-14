import { useState, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { Camera, Plus, Trash2, Star, Loader2, Sparkles } from 'lucide-react';
import { uploadProfilePhoto, MAX_PHOTO_COUNT } from '../lib/photoUpload';

type PhotoGalleryManagerProps = {
  uid: string;
  primaryPhoto: string;
  additionalPhotos: string[];
  onChange: (primaryPhoto: string, additionalPhotos: string[]) => void;
  disabled?: boolean;
};

export function PhotoGalleryManager({
  uid,
  primaryPhoto,
  additionalPhotos,
  onChange,
  disabled = false
}: PhotoGalleryManagerProps) {
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceTargetRef = useRef<number | 'primary' | 'new'>('new');

  const allPhotos = [primaryPhoto, ...additionalPhotos].filter(Boolean);

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError(null);
    const target = replaceTargetRef.current;
    const file = files[0];

    try {
      if (target === 'primary') {
        setUploadingIndex(0);
        const url = await uploadProfilePhoto(uid, file, 'primary');
        onChange(url, additionalPhotos);
      } else if (typeof target === 'number') {
        // Replacing a specific additional photo (target is 1-indexed relative to allPhotos)
        setUploadingIndex(target);
        const additionalIndex = target - 1;
        const url = await uploadProfilePhoto(uid, file, `additional_${additionalIndex}`);
        const updatedAdditionals = [...additionalPhotos];
        updatedAdditionals[additionalIndex] = url;
        onChange(primaryPhoto, updatedAdditionals);
      } else {
        // Adding new photo
        if (allPhotos.length >= MAX_PHOTO_COUNT) {
          setError(`You can upload a maximum of ${MAX_PHOTO_COUNT} photos.`);
          return;
        }
        setUploadingIndex(allPhotos.length);
        const url = await uploadProfilePhoto(uid, file, `additional_${additionalPhotos.length}`);
        if (!primaryPhoto) {
          onChange(url, additionalPhotos);
        } else {
          onChange(primaryPhoto, [...additionalPhotos, url]);
        }
      }
    } catch (err: any) {
      console.error('Photo upload error:', err);
      setError(err?.message || 'Failed to upload photo.');
    } finally {
      setUploadingIndex(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerUpload = (target: number | 'primary' | 'new') => {
    if (disabled) return;
    replaceTargetRef.current = target;
    fileInputRef.current?.click();
  };

  const setAsPrimary = (indexInAdditionals: number) => {
    if (disabled) return;
    const photoToPromote = additionalPhotos[indexInAdditionals];
    const newAdditionals = [...additionalPhotos];
    newAdditionals.splice(indexInAdditionals, 1);
    if (primaryPhoto) {
      newAdditionals.unshift(primaryPhoto);
    }
    onChange(photoToPromote, newAdditionals);
  };

  const removePhoto = (indexInAdditionals: number) => {
    if (disabled) return;
    const newAdditionals = [...additionalPhotos];
    newAdditionals.splice(indexInAdditionals, 1);
    onChange(primaryPhoto, newAdditionals);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-slate-400">
          Profile Photos & Gallery ({allPhotos.length}/{MAX_PHOTO_COUNT})
        </label>
        <span className="text-[11px] text-zinc-400 dark:text-slate-500">First photo is your main card photo</span>
      </div>

      {error && (
        <p className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl font-medium">
          {error}
        </p>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Grid of photos */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
        {/* Primary Photo Slot */}
        <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-zinc-100 dark:bg-white/5 border-2 border-rose-500 shadow-sm group">
          {primaryPhoto ? (
            <>
              <img src={primaryPhoto} alt="Primary Profile" className="w-full h-full object-cover" />
              <div className="absolute top-1.5 left-1.5 px-2 py-0.5 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center gap-1 shadow">
                <Star className="w-2.5 h-2.5 fill-current" />
                <span>Primary</span>
              </div>
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-2">
                <button
                  type="button"
                  onClick={() => triggerUpload('primary')}
                  disabled={disabled || uploadingIndex === 0}
                  className="px-2.5 py-1 bg-white text-zinc-900 rounded-lg text-[10px] font-bold shadow hover:bg-zinc-100 transition"
                >
                  Change
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => triggerUpload('primary')}
              disabled={disabled}
              className="w-full h-full flex flex-col items-center justify-center p-2 text-rose-500 hover:bg-rose-500/5 transition"
            >
              <Camera className="w-6 h-6 mb-1" />
              <span className="text-[10px] font-bold">Add Main</span>
            </button>
          )}

          {uploadingIndex === 0 && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white">
              <Loader2 className="w-5 h-5 animate-spin mb-1" />
              <span className="text-[9px] font-bold">Uploading...</span>
            </div>
          )}
        </div>

        {/* Additional Photos Slots */}
        {additionalPhotos.map((photoUrl, idx) => {
          const slotIndex = idx + 1;
          const isUploading = uploadingIndex === slotIndex;

          return (
            <div
              key={idx}
              className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 group shadow-sm"
            >
              <img src={photoUrl} alt={`Additional ${idx + 1}`} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-1">
                <button
                  type="button"
                  title="Make this your primary photo"
                  onClick={() => setAsPrimary(idx)}
                  disabled={disabled}
                  className="px-2 py-1 bg-rose-500 text-white rounded-lg text-[9px] font-bold hover:bg-rose-600 transition flex items-center gap-1 w-full justify-center"
                >
                  <Star className="w-2.5 h-2.5" />
                  <span>Set Main</span>
                </button>
                <button
                  type="button"
                  title="Replace photo"
                  onClick={() => triggerUpload(slotIndex)}
                  disabled={disabled}
                  className="px-2 py-1 bg-white/90 text-zinc-900 rounded-lg text-[9px] font-bold hover:bg-white transition w-full text-center"
                >
                  Replace
                </button>
                <button
                  type="button"
                  title="Delete photo"
                  onClick={() => removePhoto(idx)}
                  disabled={disabled}
                  className="p-1 bg-rose-500/80 text-white rounded-lg hover:bg-rose-600 transition"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              {isUploading && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white">
                  <Loader2 className="w-4 h-4 animate-spin mb-1" />
                  <span className="text-[8px] font-bold">Uploading...</span>
                </div>
              )}
            </div>
          );
        })}

        {/* Add photo placeholder slot */}
        {allPhotos.length < MAX_PHOTO_COUNT && (
          <button
            type="button"
            onClick={() => triggerUpload('new')}
            disabled={disabled || uploadingIndex !== null}
            className="aspect-[3/4] rounded-2xl border-2 border-dashed border-zinc-300 dark:border-white/20 hover:border-rose-500 dark:hover:border-rose-500/60 flex flex-col items-center justify-center p-2 text-zinc-400 hover:text-rose-500 transition group bg-zinc-50/50 dark:bg-white/[0.02]"
          >
            {uploadingIndex === allPhotos.length ? (
              <Loader2 className="w-5 h-5 animate-spin text-rose-500" />
            ) : (
              <>
                <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-white/5 flex items-center justify-center group-hover:bg-rose-500/10 transition mb-1">
                  <Plus className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold">Add Photo</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
