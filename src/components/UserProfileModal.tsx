import { useState } from 'react';
import type { FormEvent } from 'react';
import { db, auth } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { UserProfile } from '../types';
import { VerifiedBadge } from './VerifiedBadge';
import { X, User, Edit2, LogOut, Check, MapPin, Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type UserProfileModalProps = {
  profile: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated: (updatedProfile: UserProfile) => void;
  onOpenVerification?: () => void;
};

export function UserProfileModal({
  profile,
  isOpen,
  onClose,
  onProfileUpdated,
  onOpenVerification
}: UserProfileModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio || '');
  const [interests, setInterests] = useState(profile.interests?.join(', ') || '');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const interestsArray = interests.split(',').map(i => i.trim()).filter(i => i.length > 0);
      const userRef = doc(db, 'users', profile.uid);
      const updatedFields = {
        name: name.trim() || profile.name,
        bio: bio.trim(),
        interests: interestsArray
      };

      await updateDoc(userRef, updatedFields);

      const updatedProfile: UserProfile = {
        ...profile,
        ...updatedFields
      };

      onProfileUpdated(updatedProfile);
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating profile:', err);
      alert('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-md bg-white dark:bg-[#18181C] border border-zinc-200 dark:border-white/10 rounded-3xl p-6 shadow-2xl relative text-zinc-900 dark:text-slate-100 my-8"
        >
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-slate-200 rounded-full hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Profile Header */}
          <div className="flex flex-col items-center text-center space-y-3 pt-2">
            <div className="relative">
              <img
                src={profile.photoUrl}
                alt={profile.name}
                className="w-24 h-24 rounded-full object-cover border-4 border-rose-500/20 shadow-lg"
              />
              {profile.isVerified && (
                <div className="absolute bottom-0 right-0 transform translate-x-1 translate-y-1">
                  <VerifiedBadge size="lg" />
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-center gap-1.5">
                <h2 className="text-2xl font-bold">{profile.name}</h2>
                {profile.isVerified && <VerifiedBadge size="md" />}
              </div>
              <p className="text-xs text-zinc-500 dark:text-slate-400 mt-0.5">
                {profile.isVerified ? 'Verified Profile' : 'Member'}
              </p>
            </div>
          </div>

          {!isEditing ? (
            <div className="mt-6 space-y-5">
              {/* Bio Section */}
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/60 dark:border-white/5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-slate-500">
                    About Me / Bio
                  </span>
                </div>
                <p className="text-sm text-zinc-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {profile.bio ? profile.bio : <span className="italic text-zinc-400">No bio added yet. Click edit to add a bio!</span>}
                </p>
              </div>

              {/* Interests Section */}
              {profile.interests && profile.interests.length > 0 && (
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-slate-500 block mb-2">
                    Interests
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {profile.interests.map((interest) => (
                      <span
                        key={interest}
                        className="px-3 py-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-full text-xs font-medium border border-rose-500/20"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Verification Promo if not verified */}
              {!profile.isVerified && onOpenVerification && (
                <div
                  onClick={() => {
                    onClose();
                    onOpenVerification();
                  }}
                  className="p-3.5 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-blue-500/15 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500 text-white rounded-xl shadow-md">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-blue-600 dark:text-blue-400">Get Verified Badge</p>
                      <p className="text-[10px] text-zinc-500 dark:text-slate-400">Stand out with official blue checkmark</p>
                    </div>
                  </div>
                  <VerifiedBadge size="sm" />
                </div>
              )}

              {/* Actions */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="flex-1 py-3 px-4 bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-800 dark:text-slate-200 rounded-2xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Profile
                </button>
                <button
                  type="button"
                  onClick={() => signOut(auth)}
                  className="py-3 px-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-2xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSave} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-slate-400 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-zinc-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-slate-400 mb-1">
                  Bio / About Me
                </label>
                <textarea
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell potential matches about yourself..."
                  className="w-full px-4 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-zinc-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/50 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-slate-400 mb-1">
                  Interests (comma separated)
                </label>
                <input
                  type="text"
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  placeholder="Hiking, Coffee, Photography..."
                  className="w-full px-4 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-zinc-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="w-1/3 py-2.5 px-3 text-xs font-semibold text-zinc-600 dark:text-slate-400 bg-zinc-100 dark:bg-white/5 rounded-xl hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-2/3 py-2.5 px-4 bg-rose-500 text-white text-xs font-semibold rounded-xl hover:bg-rose-600 transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-rose-500/20"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Save Bio & Profile
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
