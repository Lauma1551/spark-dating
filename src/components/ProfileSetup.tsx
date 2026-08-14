import { useState, useMemo } from 'react';
import type { FormEvent, MouseEvent, KeyboardEvent } from 'react';
import { db, auth, sanitizeForFirestore } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { MapPin, Loader2, LogOut, Sparkles, Check, Heart, Calendar } from 'lucide-react';
import { UserProfile } from '../types';
import { PhotoGalleryManager } from './PhotoGalleryManager';
import { calculateAge } from '../lib/photoUpload';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80';

const SUGGESTED_INTERESTS = [
  'Hiking', 'Coffee', 'Photography', 'Travel', 'Art', 'Cooking', 
  'Music', 'Fitness', 'Cinema', 'Reading', 'Yoga', 'Tech', 'Nature'
];

export function ProfileSetup({ user, onComplete }: { user: any; onComplete: (profile: UserProfile) => void }) {
  const [firstName, setFirstName] = useState(user.displayName ? user.displayName.split(' ')[0] : '');
  const [dateOfBirth, setDateOfBirth] = useState('2000-01-01');
  const [gender, setGender] = useState<'Woman' | 'Man' | 'Non-binary' | 'Other'>('Woman');
  const [datingPreference, setDatingPreference] = useState<'Everyone' | 'Men' | 'Women'>('Everyone');
  const [lookingFor, setLookingFor] = useState<'Relationship' | 'Casual' | 'Friendship' | 'Something serious'>('Relationship');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>(['Coffee', 'Travel']);
  const [customInterest, setCustomInterest] = useState('');
  
  // Photos
  const [primaryPhoto, setPrimaryPhoto] = useState<string>(user.photoURL || DEFAULT_AVATAR);
  const [additionalPhotos, setAdditionalPhotos] = useState<string[]>([]);
  
  // Location
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dynamically calculate age from date of birth
  const age = useMemo(() => calculateAge(dateOfBirth), [dateOfBirth]);

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

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocationCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          if (!city) {
            setCity('Nearby');
          }
          setError(null);
        },
        (err) => {
          console.warn('Geolocation error:', err);
        }
      );
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedFirstName = firstName.trim();
    if (!trimmedFirstName) {
      setError('Please enter your first name.');
      return;
    }

    if (!dateOfBirth) {
      setError('Please select your date of birth.');
      return;
    }

    if (age < 18) {
      setError('You must be at least 18 years old to use Spark.');
      return;
    }

    if (age > 120) {
      setError('Please enter a valid date of birth.');
      return;
    }

    if (!primaryPhoto) {
      setError('Please add at least one primary profile photo.');
      return;
    }

    setLoading(true);
    try {
      const now = Date.now();
      const profile: UserProfile = {
        uid: user.uid,
        firstName: trimmedFirstName,
        name: trimmedFirstName, // keep for backward compatibility
        dateOfBirth,
        age,
        gender,
        datingPreference,
        interestedIn: datingPreference, // keep in sync
        preferences: {
          lookingFor,
          minAge: 18,
          maxAge: 60
        },
        bio: bio.trim(),
        interests: selectedInterests,
        photoUrl: primaryPhoto,
        profilePhotoUrl: primaryPhoto,
        additionalPhotoUrls: additionalPhotos,
        location: {
          city: city.trim() || 'Nearby',
          ...(locationCoords?.lat !== undefined ? { lat: locationCoords.lat } : {}),
          ...(locationCoords?.lng !== undefined ? { lng: locationCoords.lng } : {})
        },
        profileCompleted: true, // Marked as complete!
        createdAt: now,
        updatedAt: now,
        isVerified: false,
        blockedUserIds: []
      };

      const firestoreData = sanitizeForFirestore(profile);
      // Store in Firestore "users" collection with user.uid as Document ID
      // Passwords are NEVER stored here
      await setDoc(doc(db, 'users', user.uid), firestoreData);
      onComplete(profile);
    } catch (err: any) {
      console.error('Error creating profile:', err);
      setError(err?.message || 'Failed to save your profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-rose-50 dark:bg-[#09090B] p-4 sm:p-6 text-slate-900 dark:text-slate-100 font-sans transition-colors flex items-center justify-center py-10">
      <div className="w-full max-w-2xl bg-white dark:bg-[#1A1A1E] rounded-[36px] shadow-2xl border border-zinc-200 dark:border-white/10 p-6 sm:p-10 relative">
        
        {/* Sign out button */}
        <button
          type="button"
          onClick={() => signOut(auth)}
          className="absolute top-6 right-6 p-2 rounded-xl text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors flex items-center gap-1.5 text-xs font-semibold"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>

        {/* Header Banner */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 mb-3 shadow-inner">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Create Your Dating Profile</h2>
          <p className="text-xs text-zinc-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Tell us about yourself to discover genuine connections. Signed in as <span className="font-semibold text-zinc-700 dark:text-slate-300">{user.email}</span>
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-2xl text-xs font-semibold text-center animate-shake">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Photo Gallery Manager (Storage Uploads, Primary & Additional) */}
          <div className="p-4 rounded-3xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200/80 dark:border-white/5">
            <PhotoGalleryManager
              uid={user.uid}
              primaryPhoto={primaryPhoto}
              additionalPhotos={additionalPhotos}
              onChange={(newPrimary, newAdditionals) => {
                setPrimaryPhoto(newPrimary);
                setAdditionalPhotos(newAdditionals);
              }}
              disabled={loading}
            />
          </div>

          {/* First Name & Date of Birth (Calculated Age) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-slate-400 mb-1.5">
                First Name *
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Maya"
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-zinc-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/50 text-sm font-medium"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-slate-400">
                  Date of Birth *
                </label>
                {age > 0 && (
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    age >= 18 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600'
                  }`}>
                    {age} years old
                  </span>
                )}
              </div>
              <div className="relative">
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
          </div>

          {/* Gender & Dating Preference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-slate-400 mb-1.5">
                I am a *
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

          {/* Relationship Goal & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-slate-400 mb-1.5">
                Relationship Goal
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
              <div className="flex gap-2">
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. San Francisco, CA"
                  className="flex-1 px-4 py-3 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-zinc-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/50 text-sm font-medium"
                />
                <button
                  type="button"
                  onClick={getLocation}
                  title="Detect GPS coordinates"
                  className={`px-3.5 py-3 rounded-2xl border flex items-center justify-center transition-all ${
                    locationCoords 
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 text-rose-500'
                  }`}
                >
                  {locationCoords ? <Check className="w-4 h-4 text-emerald-500" /> : <MapPin className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-slate-400 mb-1.5">
              About Me / Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell potential matches about your passions, vibe, and what makes you laugh..."
              rows={3}
              className="w-full px-4 py-3 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-zinc-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/50 text-sm font-medium resize-none"
            />
          </div>

          {/* Interests */}
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

            {/* Custom interest tag input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={customInterest}
                onChange={(e) => setCustomInterest(e.target.value)}
                onKeyDown={addCustomInterest}
                placeholder="Add custom interest & press enter..."
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

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-6 bg-gradient-to-r from-rose-500 via-rose-600 to-violet-600 hover:from-rose-600 hover:to-violet-700 text-white font-bold rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-rose-500/25 text-base tracking-tight"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Creating Profile...</span>
              </>
            ) : (
              <>
                <Heart className="w-5 h-5 fill-current" />
                <span>Complete Profile & Start Matching</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
