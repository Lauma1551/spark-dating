import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { motion, useMotionValue, useTransform } from 'motion/react';
import { UserProfile } from '../types';
import { Heart, X, Flag } from 'lucide-react';
import { ReportModal } from './ReportModal';
import { VerifiedBadge } from './VerifiedBadge';

type SwipeAreaProps = {
  currentUser: UserProfile;
  profiles: UserProfile[];
  onSwipeLeft: (profile: UserProfile) => void;
  onSwipeRight: (profile: UserProfile) => void;
  onUserBlocked?: (blockedUid: string) => void;
};

export function SwipeArea({ currentUser, profiles, onSwipeLeft, onSwipeRight, onUserBlocked }: SwipeAreaProps) {
  const [cards, setCards] = useState<UserProfile[]>(profiles);
  const [reportingProfile, setReportingProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    setCards(profiles);
  }, [profiles]);

  const handleUserBlocked = (blockedUid: string) => {
    setCards(prev => prev.filter(c => c.uid !== blockedUid));
    onUserBlocked?.(blockedUid);
  };

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-500">
        <Heart className="w-16 h-16 mb-4 text-zinc-300 dark:text-zinc-700" />
        <p className="text-lg font-medium">No more potential matches nearby.</p>
        <p className="text-sm">Check back later!</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[580px] max-w-md mx-auto flex items-center justify-center perspective-1000 mt-4">
      {cards.map((profile, index) => (
        <SwipeCard 
          key={profile.uid} 
          profile={profile} 
          isFront={index === cards.length - 1}
          onSwipe={(dir) => {
            if (dir === 'left') onSwipeLeft(profile);
            if (dir === 'right') onSwipeRight(profile);
            setCards(prev => prev.slice(0, -1));
          }}
          onReport={() => setReportingProfile(profile)}
        />
      ))}

      {reportingProfile && (
        <ReportModal
          reportedUser={{ uid: reportingProfile.uid, name: reportingProfile.name }}
          reporterUser={currentUser}
          isOpen={!!reportingProfile}
          onClose={() => setReportingProfile(null)}
          onUserBlocked={handleUserBlocked}
        />
      )}
    </div>
  );
}

const SwipeCard: FC<{
  profile: UserProfile;
  isFront: boolean;
  onSwipe: (dir: 'left' | 'right') => void;
  onReport: () => void;
}> = ({ profile, isFront, onSwipe, onReport }) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);

  const handleDragEnd = (event: any, info: any) => {
    const offset = info.offset.x;
    if (offset > 100) {
      onSwipe('right');
    } else if (offset < -100) {
      onSwipe('left');
    }
  };

  return (
    <motion.div
      className={`absolute w-full h-full bg-white dark:bg-[#1A1A1E] rounded-[40px] shadow-2xl border border-zinc-200 dark:border-white/10 overflow-hidden cursor-grab active:cursor-grabbing group`}
      style={{
        x: isFront ? x : 0,
        rotate: isFront ? rotate : 0,
        opacity: isFront ? 1 : 0,
        scale: isFront ? 1 : 0.95,
        y: isFront ? 0 : 20,
        zIndex: isFront ? 10 : 0,
        pointerEvents: isFront ? 'auto' : 'none'
      }}
      drag={isFront ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      initial={false}
      transition={{ duration: 0.3 }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/90 z-10 pointer-events-none"></div>
      <img 
        src={profile.photoUrl} 
        alt={profile.name} 
        className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none" 
      />

      {/* Top action overlay for report button */}
      {isFront && (
        <div className="absolute top-5 right-5 z-20 pointer-events-auto">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onReport();
            }}
            title="Report User"
            className="p-2.5 bg-black/40 hover:bg-black/70 backdrop-blur-md text-white/80 hover:text-rose-400 rounded-full border border-white/10 transition-colors shadow-lg"
          >
            <Flag className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {/* Content Overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-8 z-20 text-white pointer-events-none">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-3xl font-bold">{profile.name}</h2>
            {profile.isVerified && <VerifiedBadge size="md" />}
          </div>
          
          <p className="text-slate-300 text-sm mb-4 leading-relaxed line-clamp-2">
            {profile.bio || "No bio available."}
          </p>

          <div className="flex flex-wrap gap-2 mb-6">
            {profile.interests?.slice(0, 3).map(interest => (
              <span key={interest} className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-medium">
                {interest}
              </span>
            ))}
            {(profile.interests?.length || 0) > 3 && (
              <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-medium">
                +{(profile.interests?.length || 0) - 3}
              </span>
            )}
          </div>
          
          {profile.location && (
             <div className="flex items-center gap-1 text-xs text-emerald-400 font-semibold mb-6">
               <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
               Nearby
             </div>
          )}
      </div>

      {isFront && (
        <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 flex justify-between px-6 pointer-events-none z-30">
           <motion.div 
             className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-rose-500 shadow-xl"
             style={{ opacity: useTransform(x, [-100, -50], [1, 0]) }}
           >
             <X className="w-8 h-8" />
           </motion.div>
           <motion.div 
             className="w-16 h-16 bg-rose-500 rounded-full flex items-center justify-center text-white shadow-xl"
             style={{ opacity: useTransform(x, [50, 100], [0, 1]) }}
           >
             <Heart className="w-8 h-8" />
           </motion.div>
        </div>
      )}
    </motion.div>
  );
}

