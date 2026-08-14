import { useState, useMemo } from 'react';
import type { FormEvent, MouseEvent, KeyboardEvent } from 'react';
import { db, auth, sanitizeForFirestore } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { UserProfile } from '../types';
import { VerifiedBadge } from './VerifiedBadge';
import { PhotoGalleryManager } from './PhotoGalleryManager';
import { calculateAge } from '../lib/photoUpload';
import { 
  Edit3, Eye, Check, Loader2, LogOut, MapPin, Sparkles, 
  Calendar, ShieldCheck, Heart, User, CheckCircle2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type MyProfileProps = {
  profile: UserProfile;
  onProfileUpdated: (updatedProfile: UserProfile) => void;
  onOpenVerification?: () => void;
};

const SUGGESTED_INTERESTS = [
  'Hiking', 'Coffee', 'Photography', 'Travel', 'Art', 'Cooking', 
  'Music', 'Fitness', 'Cinema', 'Reading', 'Yoga', 'Tech', 'Nature'
];

export function MyProfile({ profile, onProfileUpdated, onOpenVerification }: MyProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  
  // Form State
  const [firstName, setFirstName] = useState(profile.firstName || profile.name || '');
  const [dateOfBirth, setDateOfBirth] = useState(profile.dateOfBirth || '2000-01-01');
  const [gender, setGender] = useState(profile.gender || 'Woman');
  const [datingPreference, setDatingPreference] = useState(profile.datingPreference || profile.interestedIn || 'Everyone');
  const [lookingFor, setLookingFor] = useState(profile.preferences?.lookingFor || 'Relationship');
  const [city, setCity] = useState(profile.location?.city || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [selectedInterests, setSelectedInterests] = useState<string[]>(profile.interests || []);
  const [customInterest, setCustomInterest] = useState('');
  
  // Photos
  const [primaryPhoto, setPrimaryPhoto] = useState(profile.photoUrl || profile.profilePhotoUrl || '');
  const [additionalPhotos, setAdditionalPhotos] = useState<string[]>(profile.additionalPhotoUrls || []);
  
  // Save status
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active gallery index for preview modal/view
  const [previewPhotoIndex, setPreviewPhotoIndex] = useState(0);

  const allPhotos = [primaryPhoto, ...additionalPhotos].filter(Boolean);

  // Calculate age from DOB
  const calculatedAge = useMemo(() => {
    const computed = calculateAge(dateOfBirth);
    return computed > 0 ? computed : (profile.age || 24);
  }, [dateOfBirth, profile.age]);

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  const addCustomInterest = (e: KeyboardEvent | MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const trimmed = customInterest.trim();
    if (trimmed && !selectedInterests.includes(trimmed)) {
      setSelectedInterests(prev => [...prev, trimmed]);
      setCustomInterest('');
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaveSuccess(false);

    const trimmedName = firstName.trim();
    if (!trimmedName) {
      setError('First name is required.');
      return;
    }

    if (calculatedAge < 18) {
      setError('You must be at least 18 years old.');
      return;
    }

    if (!primaryPhoto) {
      setError('Please provide at least one profile photo.');
      return;
    }

    setSaving(true);
    try {
      const now = Date.now();
      const updatedFields: Partial<UserProfile> = {
        firstName: trimmedName,
        name: trimmedName,
        dateOfBirth,
        age: calculatedAge,
        gender,
        datingPreference,
        interestedIn: datingPreference,
        preferences: {
          ...profile.preferences,
          lookingFor
        },
        location: {
          ...profile.location,
          city: city.trim() || 'Nearby'
        },
        bio: bio.trim(),
        interests: selectedInterests,
        photoUrl: primaryPhoto,
        profilePhotoUrl: primaryPhoto,
        additionalPhotoUrls: additionalPhotos,
        profileCompleted: true,
        updatedAt: now
      };

      const userDocRef = doc(db, 'users', profile.uid);
      const firestoreData = sanitizeForFirestore(updatedFields);
      await updateDoc(userDocRef, firestoreData);

      const mergedProfile: UserProfile = {
        ...profile,
        ...updatedFields
      };

      onProfileUpdated(mergedProfile);
      setSaveSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      console.error('Error updating profile in Firestore:', err);
      setError(err?.message || 'Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 pb-24 text-slate-900 dark:text-slate-100 font-sans">
      
      {/* Top action bar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">My Profile</h1>
          <p className="text-xs text-zinc-500 dark:text-slate-400 mt-0.5">Manage your dating profile, photos & preferences</p>
        </div>

        <div className="flex items-center gap-2">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl text-xs font-bold transition shadow-lg shadow-rose-500/20"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Profile</span>
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(false)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-zinc-100 dark:bg-white/10 hover:bg-zinc-200 dark:hover:bg-white/20 text-zinc-800 dark:text-slate-200 rounded-2xl text-xs font-bold transition"
            >
              <Eye className="w-4 h-4" />
              <span>Preview Card</span>
            </button>
          )}
        </div>
      </div>

      {/* Success Notification Banner */}
      <AnimatePresence>
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center gap-2.5 text-xs sm:text-sm font-semibold shadow-sm"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            <span>Profile successfully updated in Firestore!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-2xl text-xs font-semibold">
          {error}
        </div>
      )}

      {!isEditing ? (
        /* View Mode (Premium Profile Showcase) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Photo Gallery Carousel */}
          <div className="lg:col-span-5 space-y-4">
            <div className="relative aspect-[3/4] w-full rounded-3xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-white/10 bg-zinc-900 group">
              <img
                src={allPhotos[previewPhotoIndex] || primaryPhoto}
                alt={firstName}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
              
              {/* Profile Card Header overlay */}
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                <div className="flex items-center gap-1.5 px-3 py-1 bg-black/40 backdrop-blur-md rounded-full text-white text-xs font-semibold">
                  <span>{previewPhotoIndex + 1}/{allPhotos.length}</span>
                </div>
                {profile.isVerified && <VerifiedBadge size="md" />}
              </div>

              {/* Card Footer Info */}
              <div className="absolute bottom-5 left-5 right-5 text-white">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-2xl sm:text-3xl font-extrabold">{firstName}, {profile.age || calculatedAge}</h2>
                </div>
                <div className="flex items-center gap-2 text-xs text-white/90 font-medium mb-1">
                  <span>{profile.gender || 'Member'}</span>
                  <span>•</span>
                  <span>{profile.location?.city || 'Nearby'}</span>
                </div>
                {profile.preferences?.lookingFor && (
                  <span className="inline-block px-2.5 py-1 bg-rose-500/80 backdrop-blur-md rounded-full text-[11px] font-bold text-white shadow">
                    Seeking {profile.preferences.lookingFor}
                  </span>
                )}
              </div>
            </div>

            {/* Thumbnail selector */}
            {allPhotos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {allPhotos.map((url, idx) => (
                  <button
                    key={idx}
                    onClick={() => setPreviewPhotoIndex(idx)}
                    className={`w-16 h-20 rounded-xl overflow-hidden border-2 transition shrink-0 ${
                      previewPhotoIndex === idx ? 'border-rose-500 scale-105 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={url} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Verification status card */}
            <div className="p-4 rounded-3xl bg-white dark:bg-[#1A1A1E] border border-zinc-200 dark:border-white/10 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-2xl ${profile.isVerified ? 'bg-blue-500 text-white' : 'bg-zinc-100 dark:bg-white/5 text-zinc-400'}`}>
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold">{profile.isVerified ? 'Verified Profile' : 'Profile Unverified'}</p>
                  <p className="text-[11px] text-zinc-500 dark:text-slate-400">
                    {profile.isVerified ? 'Official blue checkmark active' : 'Verify photo to get 3x more matches'}
                  </p>
                </div>
              </div>
              {!profile.isVerified && onOpenVerification && (
                <button
                  onClick={onOpenVerification}
                  className="px-3 py-1.5 bg-blue-500 text-white rounded-xl text-xs font-bold hover:bg-blue-600 transition shadow-sm"
                >
                  Verify Now
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Detailed Info Sections */}
          <div className="lg:col-span-7 space-y-5">
            
            {/* Bio Card */}
            <div className="p-6 rounded-3xl bg-white dark:bg-[#1A1A1E] border border-zinc-200 dark:border-white/10 shadow-sm space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-slate-500">
                About Me
              </span>
              <p className="text-sm sm:text-base text-zinc-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                {profile.bio ? profile.bio : <span className="italic text-zinc-400">No bio written yet. Click 'Edit Profile' to introduce yourself!</span>}
              </p>
            </div>

            {/* Dating Preferences Card */}
            <div className="p-6 rounded-3xl bg-white dark:bg-[#1A1A1E] border border-zinc-200 dark:border-white/10 shadow-sm space-y-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-slate-500">
                Dating Preferences & Match Settings
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/60 dark:border-white/5">
                  <p className="text-[10px] uppercase font-bold text-zinc-400">Looking to meet</p>
                  <p className="text-sm font-bold text-zinc-800 dark:text-slate-100 mt-0.5">{profile.datingPreference || profile.interestedIn || 'Everyone'}</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/60 dark:border-white/5">
                  <p className="text-[10px] uppercase font-bold text-zinc-400">Looking for</p>
                  <p className="text-sm font-bold text-rose-500 mt-0.5">{profile.preferences?.lookingFor || 'Relationship'}</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/60 dark:border-white/5">
                  <p className="text-[10px] uppercase font-bold text-zinc-400">Gender</p>
                  <p className="text-sm font-bold text-zinc-800 dark:text-slate-100 mt-0.5">{profile.gender || 'Woman'}</p>
                </div>
              </div>
            </div>

            {/* Passions & Interests */}
            <div className="p-6 rounded-3xl bg-white dark:bg-[#1A1A1E] border border-zinc-200 dark:border-white/10 shadow-sm space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-slate-500">
                Passions & Interests
              </span>
              {profile.interests && profile.interests.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map((interest) => (
                    <span
                      key={interest}
                      className="px-3.5 py-1.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-full text-xs font-semibold border border-rose-500/20"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-400 italic">No interests added yet.</p>
              )}
            </div>

            {/* Account Details & Logout */}
            <div className="p-6 rounded-3xl bg-white dark:bg-[#1A1A1E] border border-zinc-200 dark:border-white/10 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-zinc-800 dark:text-slate-200">Account Security</p>
                <p className="text-[11px] text-zinc-500 dark:text-slate-400">Firebase UID: <code className="text-[10px] bg-zinc-100 dark:bg-white/5 px-1.5 py-0.5 rounded">{profile.uid}</code></p>
              </div>
              <button
                onClick={() => signOut(auth)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center justify-center gap-1.5 transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>

          </div>
        </div>
      ) : (
        /* Edit Mode */
        <form onSubmit={handleSave} className="space-y-6 bg-white dark:bg-[#1A1A1E] rounded-[32px] p-6 sm:p-8 border border-zinc-200 dark:border-white/10 shadow-xl">
          
          {/* Photo Gallery Manager */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200/80 dark:border-white/5">
            <PhotoGalleryManager
              uid={profile.uid}
              primaryPhoto={primaryPhoto}
              additionalPhotos={additionalPhotos}
              onChange={(newPrimary, newAdditionals) => {
                setPrimaryPhoto(newPrimary);
                setAdditionalPhotos(newAdditionals);
              }}
              disabled={saving}
            />
          </div>

          {/* First Name & Date of Birth */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-slate-400 mb-1.5">
                First Name *
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-zinc-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/50 text-sm font-medium"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-slate-400">
                  Date of Birth *
                </label>
                <span className="text-[11px] font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full">
                  {calculatedAge} years old
                </span>
              </div>
              <input
                type="date"
                value={dateOfBirth}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-zinc-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/50 text-sm font-medium"
                required
              />
            </div>
          </div>

          {/* Gender & Dating Preference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-slate-400 mb-1.5">
                Gender *
              </label>
              <select
                value={gender}
                onChange={(e: any) => setGender(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-zinc-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/50 text-sm font-medium"
              >
                <option value="Woman">Woman</option>
                <option value="Man">Man</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-slate-400 mb-1.5">
                Looking to meet *
              </label>
              <select
                value={datingPreference}
                onChange={(e: any) => setDatingPreference(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-zinc-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/50 text-sm font-medium"
              >
                <option value="Everyone">Everyone</option>
                <option value="Men">Men</option>
                <option value="Women">Women</option>
              </select>
            </div>
          </div>

          {/* Relationship Goal & City */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-slate-400 mb-1.5">
                Looking For
              </label>
              <select
                value={lookingFor}
                onChange={(e: any) => setLookingFor(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-zinc-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/50 text-sm font-medium"
              >
                <option value="Relationship">Long-term Relationship</option>
                <option value="Something serious">Something Serious</option>
                <option value="Casual">Casual Dating</option>
                <option value="Friendship">New Friends</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-slate-400 mb-1.5">
                City / Location
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Austin, TX"
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-zinc-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/50 text-sm font-medium"
              />
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-slate-400 mb-1.5">
              About Me / Bio
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell potential matches about your passions, vibe, and what makes you laugh..."
              className="w-full px-4 py-3 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-zinc-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/50 text-sm font-medium resize-none"
            />
          </div>

          {/* Passions & Interests */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-slate-400 mb-2">
              Passions & Interests ({selectedInterests.length} selected)
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {SUGGESTED_INTERESTS.map((interest) => {
                const isSelected = selectedInterests.includes(interest);
                return (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/30 scale-105'
                        : 'bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-slate-300 hover:bg-zinc-200 dark:hover:bg-white/10'
                    }`}
                  >
                    {interest}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={customInterest}
                onChange={(e) => setCustomInterest(e.target.value)}
                onKeyDown={addCustomInterest}
                placeholder="Add custom interest & enter..."
                className="flex-1 px-4 py-2 text-xs rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-zinc-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
              />
              <button
                type="button"
                onClick={addCustomInterest}
                className="px-4 py-2 bg-zinc-100 dark:bg-white/10 text-zinc-800 dark:text-slate-200 text-xs font-bold rounded-xl hover:bg-zinc-200 dark:hover:bg-white/20 transition"
              >
                Add
              </button>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200/80 dark:border-white/5">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-5 py-3 text-xs font-bold text-zinc-600 dark:text-slate-400 bg-zinc-100 dark:bg-white/5 rounded-2xl hover:bg-zinc-200 dark:hover:bg-white/10 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white text-xs font-bold rounded-2xl shadow-lg shadow-rose-500/25 flex items-center gap-2 transition disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving to Firestore...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save All Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
