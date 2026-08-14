/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, query, where, addDoc, updateDoc } from 'firebase/firestore';
import { Auth } from './components/Auth';
import { ProfileSetup } from './components/ProfileSetup';
import { SwipeArea } from './components/SwipeArea';
import { Matches } from './components/Matches';
import { MyProfile } from './components/MyProfile';
import { SettingsModal } from './components/SettingsModal';
import { NotificationManager } from './components/NotificationManager';
import { VerificationModal } from './components/VerificationModal';
import { VerifiedBadge } from './components/VerifiedBadge';
import { UserProfile } from './types';
import { Moon, Sun, Flame, MessageCircle, LogOut, User, Sliders, Sparkles } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'swipe' | 'matches' | 'profile'>('swipe');
  const [potentialMatches, setPotentialMatches] = useState<UserProfile[]>([]);
  const [darkMode, setDarkMode] = useState(false);
  const [isVerificationOpen, setIsVerificationOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true);
    }
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setUser(authUser);
      if (authUser) {
        try {
          const docRef = doc(db, 'users', authUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const loadedProfile = docSnap.data() as UserProfile;
            setProfile(loadedProfile);
            if (loadedProfile.profileCompleted) {
              loadPotentialMatches(authUser.uid, loadedProfile);
            }
            
            // Update lastSeen immediately
            await updateDoc(docRef, { lastSeen: Date.now() }).catch(() => {});
            
            // Update lastSeen every minute
            intervalId = setInterval(() => {
              updateDoc(docRef, { lastSeen: Date.now() }).catch(() => {});
            }, 60000);
          } else {
            setProfile(null);
          }
        } catch (e) {
          console.error('Error fetching user profile:', e);
          setProfile(null);
        }
      } else {
        setProfile(null);
        if (intervalId) clearInterval(intervalId);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  const loadPotentialMatches = async (currentUid: string, userProfile?: UserProfile) => {
    try {
      const activeProfile = userProfile || profile;
      const myBlockedUids = activeProfile?.blockedUserIds || [];
      const q = query(collection(db, 'users'), where('uid', '!=', currentUid));
      const querySnapshot = await getDocs(q);
      
      const matches = querySnapshot.docs
        .map(d => d.data() as UserProfile)
        .filter(u => {
          // Exclude incomplete profiles
          if (!u.profileCompleted && !u.name) return false;
          // Exclude blocked profiles
          if (myBlockedUids.includes(u.uid)) return false;
          if (u.blockedUserIds?.includes(currentUid)) return false;
          return true;
        });

      setPotentialMatches(matches);
    } catch (e) {
      console.error("Error loading potential matches:", e);
    }
  };

  const handleUserBlocked = (blockedUid: string) => {
    setPotentialMatches(prev => prev.filter(u => u.uid !== blockedUid));
    setProfile(prev => {
      if (!prev) return null;
      const currentBlocked = prev.blockedUserIds || [];
      if (currentBlocked.includes(blockedUid)) return prev;
      return { ...prev, blockedUserIds: [...currentBlocked, blockedUid] };
    });
  };

  const handleSwipeRight = async (likedProfile: UserProfile) => {
    if (!profile) return;
    try {
      const q = query(collection(db, 'matches'), where('users', 'array-contains', profile.uid));
      const existingMatches = await getDocs(q);
      
      const alreadyMatched = existingMatches.docs.some(d => {
        const data = d.data();
        return data.users.includes(likedProfile.uid);
      });

      if (!alreadyMatched) {
        await addDoc(collection(db, 'matches'), {
          users: [profile.uid, likedProfile.uid],
          createdAt: Date.now()
        });
      }
    } catch (e) {
      console.error("Error creating match", e);
    }
  };

  const handleSwipeLeft = (_passedProfile: UserProfile) => {
    // Dismiss
  };

  const handleProfileComplete = (newProfile: UserProfile) => {
    setProfile(newProfile);
    if (user) {
      loadPotentialMatches(user.uid, newProfile);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-rose-50 dark:bg-[#09090B]">
        <Flame className="w-12 h-12 text-rose-500 animate-pulse" />
      </div>
    );
  }

  // 1. Unauthenticated -> Show Auth Form
  if (!user) {
    return (
      <div className={darkMode ? 'dark' : ''}>
         <Auth onLogin={setUser} />
      </div>
    );
  }

  // 2. Authenticated but Incomplete Profile -> Force Profile Setup Flow
  if (!profile || !profile.profileCompleted) {
    return (
      <div className={darkMode ? 'dark' : ''}>
        <ProfileSetup user={user} onComplete={handleProfileComplete} />
      </div>
    );
  }

  // 3. Authenticated and Profile Completed -> Main Dating App Experience
  return (
    <div className={`min-h-screen bg-rose-50 dark:bg-[#09090B] text-slate-900 dark:text-slate-100 flex flex-col font-sans ${darkMode ? 'dark' : ''}`}>
      <NotificationManager currentUser={profile} />
      
      {/* Top Header */}
      <header className="px-5 sm:px-8 py-4 flex items-center justify-between bg-white dark:bg-[#121216] border-b border-zinc-200 dark:border-white/5 z-20 sticky top-0">
        <div 
          className="flex items-center gap-3 cursor-pointer" 
          onClick={() => setActiveTab('swipe')}
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 via-rose-600 to-violet-600 flex items-center justify-center shadow-lg shadow-rose-500/20">
            <Flame className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-rose-500 to-violet-600 bg-clip-text text-transparent">Spark</h1>
            <p className="text-[10px] text-zinc-400 font-semibold tracking-wider uppercase -mt-0.5">Dating & Matches</p>
          </div>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Verification Shortcut */}
          <button
            onClick={() => setIsVerificationOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${
              profile.isVerified
                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 hover:bg-blue-500/20'
                : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-blue-500/20'
            }`}
          >
            <VerifiedBadge size="sm" />
            <span className="hidden sm:inline">{profile.isVerified ? 'Verified' : 'Get Verified'}</span>
          </button>

          {/* Settings Button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2.5 rounded-2xl bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-600 dark:text-slate-400 transition"
            title="Discovery & App Settings"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Dark Mode Toggle */}
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="p-2.5 rounded-2xl bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-600 dark:text-slate-400 transition"
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Sign Out Button */}
          <button
            onClick={() => signOut(auth)}
            className="p-2.5 rounded-2xl bg-zinc-100 dark:bg-white/5 hover:bg-rose-500/10 hover:text-rose-500 text-zinc-600 dark:text-slate-400 transition"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>

          {/* User Profile Avatar (Quick Link to My Profile) */}
          <div 
            className={`w-10 h-10 rounded-2xl border-2 p-0.5 overflow-hidden cursor-pointer relative transition-all ${
              activeTab === 'profile' ? 'border-rose-500 ring-4 ring-rose-500/20' : 'border-zinc-300 dark:border-white/10 hover:border-rose-500'
            }`} 
            onClick={() => setActiveTab('profile')} 
            title="My Profile"
          >
            <img 
              src={profile.photoUrl || profile.profilePhotoUrl} 
              alt="Profile" 
              className="w-full h-full rounded-[14px] object-cover"
            />
            {profile.isVerified && (
              <div className="absolute -bottom-0.5 -right-0.5">
                <VerifiedBadge size="sm" />
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Verification Modal */}
      <VerificationModal
        currentUser={profile}
        isOpen={isVerificationOpen}
        onClose={() => setIsVerificationOpen(false)}
        onVerified={(updatedProfile) => setProfile(updatedProfile)}
      />

      {/* Settings Modal */}
      <SettingsModal
        profile={profile}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onProfileUpdated={(updated) => setProfile(updated)}
        onOpenVerification={() => setIsVerificationOpen(true)}
      />

      {/* Main Content View Switcher */}
      <main className="flex-1 overflow-y-auto flex flex-col relative">
        {activeTab === 'swipe' && (
          <SwipeArea 
            currentUser={profile}
            profiles={potentialMatches} 
            onSwipeLeft={handleSwipeLeft} 
            onSwipeRight={handleSwipeRight} 
            onUserBlocked={handleUserBlocked}
          />
        )}

        {activeTab === 'matches' && (
          <div className="p-4 sm:p-6 flex-1 flex flex-col">
            <Matches currentUser={profile} />
          </div>
        )}

        {activeTab === 'profile' && (
          <MyProfile
            profile={profile}
            onProfileUpdated={(updated) => setProfile(updated)}
            onOpenVerification={() => setIsVerificationOpen(true)}
          />
        )}
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="bg-white/90 dark:bg-[#121216]/90 backdrop-blur-lg border-t border-zinc-200 dark:border-white/5 pb-safe pt-2 px-6 flex justify-around items-center h-20 shrink-0 sticky bottom-0 z-20">
        <button 
          onClick={() => setActiveTab('swipe')}
          className={`flex flex-col items-center gap-1 py-2 px-4 transition-all rounded-2xl ${
            activeTab === 'swipe' 
              ? 'text-rose-500 bg-rose-500/10 font-bold scale-105' 
              : 'text-zinc-400 dark:text-slate-500 hover:text-zinc-700 dark:hover:text-slate-300'
          }`}
        >
          <Flame className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Discover</span>
        </button>

        <button 
          onClick={() => setActiveTab('matches')}
          className={`flex flex-col items-center gap-1 py-2 px-4 transition-all rounded-2xl ${
            activeTab === 'matches' 
              ? 'text-rose-500 bg-rose-500/10 font-bold scale-105' 
              : 'text-zinc-400 dark:text-slate-500 hover:text-zinc-700 dark:hover:text-slate-300'
          }`}
        >
          <MessageCircle className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Matches</span>
        </button>

        <button 
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center gap-1 py-2 px-4 transition-all rounded-2xl ${
            activeTab === 'profile' 
              ? 'text-rose-500 bg-rose-500/10 font-bold scale-105' 
              : 'text-zinc-400 dark:text-slate-500 hover:text-zinc-700 dark:hover:text-slate-300'
          }`}
        >
          <User className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-wider">My Profile</span>
        </button>
      </nav>
    </div>
  );
}
