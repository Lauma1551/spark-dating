import { useState } from 'react';
import { auth, db, sanitizeForFirestore } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { UserProfile } from '../types';
import { 
  Moon, Sun, Bell, Shield, Heart, LogOut, Check, 
  Sliders, User, X, Loader2, Sparkles 
} from 'lucide-react';

type SettingsModalProps = {
  profile: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onProfileUpdated: (updated: UserProfile) => void;
  onOpenVerification?: () => void;
};

export function SettingsModal({
  profile,
  isOpen,
  onClose,
  darkMode,
  onToggleDarkMode,
  onProfileUpdated,
  onOpenVerification
}: SettingsModalProps) {
  const [minAge, setMinAge] = useState(profile.preferences?.minAge || 18);
  const [maxAge, setMaxAge] = useState(profile.preferences?.maxAge || 45);
  const [lookingFor, setLookingFor] = useState(profile.preferences?.lookingFor || 'Relationship');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSavePreferences = async () => {
    setSaving(true);
    try {
      const userDocRef = doc(db, 'users', profile.uid);
      const updatedPrefs = {
        ...profile.preferences,
        minAge: Number(minAge),
        maxAge: Number(maxAge),
        lookingFor
      };
      await updateDoc(userDocRef, sanitizeForFirestore({
        preferences: updatedPrefs,
        updatedAt: Date.now()
      }));
      onProfileUpdated({
        ...profile,
        preferences: updatedPrefs
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      console.error('Error updating preferences in Firestore:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white dark:bg-[#18181C] border border-zinc-200 dark:border-white/10 rounded-[32px] p-6 sm:p-8 shadow-2xl relative text-zinc-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-slate-200 rounded-full hover:bg-zinc-100 dark:hover:bg-white/5 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">App & Discovery Settings</h2>
            <p className="text-xs text-zinc-500 dark:text-slate-400">Manage discovery preferences and account</p>
          </div>
        </div>

        <div className="space-y-6">
          
          {/* Discovery Age Range */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/60 dark:border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-slate-400">
                Age Preference Range
              </span>
              <span className="text-xs font-bold text-rose-500">
                {minAge} - {maxAge} years
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Min Age ({minAge})</label>
                <input
                  type="range"
                  min="18"
                  max="60"
                  value={minAge}
                  onChange={(e) => setMinAge(Math.min(Number(e.target.value), maxAge - 1))}
                  className="w-full accent-rose-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Max Age ({maxAge})</label>
                <input
                  type="range"
                  min="19"
                  max="70"
                  value={maxAge}
                  onChange={(e) => setMaxAge(Math.max(Number(e.target.value), minAge + 1))}
                  className="w-full accent-rose-500"
                />
              </div>
            </div>
          </div>

          {/* Relationship Goal */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/60 dark:border-white/5 space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-slate-400 block">
              Relationship Goal Filter
            </label>
            <select
              value={lookingFor}
              onChange={(e: any) => setLookingFor(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#121216] text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/50"
            >
              <option value="Relationship">Long-term Relationship</option>
              <option value="Something serious">Something Serious</option>
              <option value="Casual">Casual Dating</option>
              <option value="Friendship">New Friends</option>
            </select>
          </div>

          {/* Save Discovery Preferences */}
          <button
            type="button"
            onClick={handleSavePreferences}
            disabled={saving}
            className="w-full py-2.5 px-4 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <>
                <Check className="w-4 h-4" />
                <span>Preferences Saved!</span>
              </>
            ) : (
              <span>Save Discovery Settings</span>
            )}
          </button>

          {/* Appearance & Theme */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/60 dark:border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {darkMode ? <Moon className="w-5 h-5 text-indigo-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
              <div>
                <p className="text-xs font-bold">Dark Mode</p>
                <p className="text-[11px] text-zinc-400">Toggle dark / light appearance</p>
              </div>
            </div>
            <button
              onClick={onToggleDarkMode}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${darkMode ? 'bg-rose-500' : 'bg-zinc-300'}`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-0'}`}
              />
            </button>
          </div>

          {/* Verification Shortcut */}
          {!profile.isVerified && onOpenVerification && (
            <div
              onClick={() => {
                onClose();
                onOpenVerification();
              }}
              className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between cursor-pointer hover:bg-blue-500/15 transition"
            >
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400">Profile Verification</p>
                  <p className="text-[11px] text-zinc-500 dark:text-slate-400">Selfie verification check</p>
                </div>
              </div>
              <span className="text-xs font-bold text-blue-500">Verify &rarr;</span>
            </div>
          )}

          {/* Account and Sign Out */}
          <div className="pt-2 border-t border-zinc-200 dark:border-white/10 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-zinc-700 dark:text-slate-300">Signed in as</p>
              <p className="text-[11px] text-zinc-400">{auth.currentUser?.email}</p>
            </div>

            <button
              type="button"
              onClick={() => signOut(auth)}
              className="px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
