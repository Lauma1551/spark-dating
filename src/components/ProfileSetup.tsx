import { useState, useRef } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Camera, MapPin, Loader2 } from 'lucide-react';
import { UserProfile } from '../types';

export function ProfileSetup({ user, onComplete }: { user: any, onComplete: (profile: UserProfile) => void }) {
  const [name, setName] = useState(user.displayName || '');
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState('');
  const [photo, setPhoto] = useState<string | null>(user.photoURL || null);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [loading, setLoading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        },
        (error) => {
          console.error("Error getting location:", error);
          alert("Could not get location. You can still proceed without it.");
        }
      );
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name || !photo) return alert("Name and photo are required!");
    
    setLoading(true);
    try {
      const interestsArray = interests.split(',').map(i => i.trim()).filter(i => i.length > 0);
      
      const profile: UserProfile = {
        uid: user.uid,
        name,
        bio,
        interests: interestsArray,
        photoUrl: photo,
        location,
        createdAt: Date.now(),
      };

      await setDoc(doc(db, 'users', user.uid), profile);
      onComplete(profile);
    } catch (err) {
      console.error(err);
      alert("Error saving profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-rose-50 dark:bg-[#09090B] p-4 text-slate-900 dark:text-slate-100 font-sans">
      <div className="w-full max-w-md bg-white dark:bg-[#1A1A1E] rounded-[40px] shadow-2xl border border-zinc-200 dark:border-white/10 p-10">
        <h2 className="text-3xl font-bold text-center mb-8 tracking-tight">
          Set up profile
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div 
              className="relative w-32 h-32 rounded-full bg-zinc-100 dark:bg-slate-800 border-4 border-white dark:border-[#121216] shadow-xl overflow-hidden cursor-pointer group ring-4 ring-white/5"
              onClick={() => fileInputRef.current?.click()}
            >
              {photo ? (
                <img src={photo} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                  <Camera className="w-8 h-8 mb-1" />
                  <span className="text-xs font-bold uppercase tracking-widest">Upload</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-8 h-8 text-white" />
              </div>
            </div>
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handlePhotoUpload}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-zinc-700 dark:text-slate-500 mb-2">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-zinc-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-zinc-700 dark:text-slate-500 mb-2">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-zinc-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all text-sm resize-none h-28"
              placeholder="Tell us about yourself..."
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-zinc-700 dark:text-slate-500 mb-2">Interests</label>
            <input
              type="text"
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-zinc-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all text-sm"
              placeholder="Hiking, Coffee, Movies..."
            />
          </div>

          <div>
            <button
              type="button"
              onClick={getLocation}
              className={`w-full py-4 flex items-center justify-center gap-3 rounded-2xl border font-semibold text-sm transition-all ${location ? 'border-emerald-500/50 text-emerald-500 bg-emerald-500/10' : 'border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-slate-300 bg-zinc-50 dark:bg-white/5 hover:bg-white/10'}`}
            >
              <MapPin className="w-5 h-5" />
              {location ? 'Location Captured' : 'Share Location for Matches'}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-2xl transition-colors disabled:opacity-50 flex items-center justify-center shadow-lg shadow-rose-500/20"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Complete Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}
