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
import { NotificationManager } from './components/NotificationManager';
import { VerificationModal } from './components/VerificationModal';
import { UserProfileModal } from './components/UserProfileModal';
import { VerifiedBadge } from './components/VerifiedBadge';
import { UserProfile } from './types';
import { Moon, Sun, Flame, MessageCircle, LogOut } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'swipe' | 'matches'>('swipe');
  const [potentialMatches, setPotentialMatches] = useState<UserProfile[]>([]);
  const [darkMode, setDarkMode] = useState(false);
  const [isVerificationOpen, setIsVerificationOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

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

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const loadedProfile = docSnap.data() as UserProfile;
          setProfile(loadedProfile);
          loadPotentialMatches(user.uid, loadedProfile);
          
          // Update lastSeen immediately
          await updateDoc(docRef, { lastSeen: Date.now() });
          
          // Update lastSeen every minute
          intervalId = setInterval(() => {
            updateDoc(docRef, { lastSeen: Date.now() }).catch(console.error);
          }, 60000);
        } else {
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
        .map(doc => doc.data() as UserProfile)
        .filter(u => {
          if (myBlockedUids.includes(u.uid)) return false;
          if (u.blockedUserIds?.includes(currentUid)) return false;
          return true;
        });
      setPotentialMatches(matches);
    } catch (e) {
      console.error("Error loading matches:", e);
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
      // Simulate checking if they already liked us (a match)
      // For simplicity in this prototype, a right swipe instantly creates a match
      const q = query(collection(db, 'matches'), where('users', 'array-contains', profile.uid));
      const existingMatches = await getDocs(q);
      
      const alreadyMatched = existingMatches.docs.some(doc => {
        const data = doc.data();
        return data.users.includes(likedProfile.uid);
      });

      if (!alreadyMatched) {
        await addDoc(collection(db, 'matches'), {
          users: [profile.uid, likedProfile.uid],
          createdAt: Date.now()
        });
        // NotificationManager handles the visual alert
      }
    } catch (e) {
      console.error("Error creating match", e);
    }
  };

  const handleSwipeLeft = (passedProfile: UserProfile) => {
    // Do nothing for now, just dismiss
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-rose-50 dark:bg-[#09090B]">
        <Flame className="w-12 h-12 text-rose-500 animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className={darkMode ? 'dark' : ''}>
         <Auth onLogin={setUser} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={darkMode ? 'dark' : ''}>
        <ProfileSetup user={user} onComplete={setProfile} />
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-rose-50 dark:bg-[#09090B] text-slate-900 dark:text-slate-100 flex flex-col font-sans ${darkMode ? 'dark' : ''}`}>
      <NotificationManager currentUser={profile} />
      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between bg-white dark:bg-[#121216] border-b border-zinc-200 dark:border-white/5 z-10 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-violet-600 flex items-center justify-center shadow-lg shadow-rose-500/20">
            <Flame className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Spark</h1>
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => setIsVerificationOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all shadow-sm ${
              profile.isVerified
                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 hover:bg-blue-500/20'
                : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-blue-500/20'
            }`}
          >
            <VerifiedBadge size="sm" />
            <span className="hidden xs:inline">{profile.isVerified ? 'Verified Member' : 'Get Verified'}</span>
          </button>

          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-600 dark:text-slate-400 transition-colors"
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <div 
            className="w-10 h-10 rounded-full border-2 border-rose-500 p-0.5 overflow-hidden ring-4 ring-rose-500/10 cursor-pointer relative" 
            onClick={() => setIsProfileModalOpen(true)} 
            title="View Profile"
          >
            <img 
              src={profile.photoUrl} 
              alt="Profile" 
              className="w-full h-full rounded-full object-cover"
            />
            {profile.isVerified && (
              <div className="absolute -bottom-0.5 -right-0.5">
                <VerifiedBadge size="sm" />
              </div>
            )}
          </div>
        </div>
      </header>

      <VerificationModal
        currentUser={profile}
        isOpen={isVerificationOpen}
        onClose={() => setIsVerificationOpen(false)}
        onVerified={(updatedProfile) => setProfile(updatedProfile)}
      />

      <UserProfileModal
        profile={profile}
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onProfileUpdated={(updatedProfile) => setProfile(updatedProfile)}
        onOpenVerification={() => setIsVerificationOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden flex flex-col relative">
        {activeTab === 'swipe' ? (
          <SwipeArea 
            currentUser={profile}
            profiles={potentialMatches} 
            onSwipeLeft={handleSwipeLeft} 
            onSwipeRight={handleSwipeRight} 
            onUserBlocked={handleUserBlocked}
          />
        ) : (
          <div className="p-4 flex-1 overflow-hidden flex flex-col">
            <Matches currentUser={profile} />
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-white dark:bg-[#121216] border-t border-zinc-200 dark:border-white/5 pb-safe pt-2 px-6 flex justify-around items-center h-20 shrink-0 sticky bottom-0">
        <button 
          onClick={() => setActiveTab('swipe')}
          className={`flex flex-col items-center gap-1 p-3 transition-colors rounded-xl ${activeTab === 'swipe' ? 'text-rose-500 bg-rose-500/10' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <Flame className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:block">Discover</span>
        </button>
        <button 
          onClick={() => setActiveTab('matches')}
          className={`flex flex-col items-center gap-1 p-3 transition-colors rounded-xl ${activeTab === 'matches' ? 'text-rose-500 bg-rose-500/10' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <MessageCircle className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:block">Matches</span>
        </button>
      </nav>
    </div>
  );
}
