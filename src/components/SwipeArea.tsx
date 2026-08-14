import { useState, useEffect } from 'react';
import type { FC, MouseEvent } from 'react';
import { motion, useMotionValue, useTransform } from 'motion/react';
import { UserProfile } from '../types';
import { Heart, X, Flag, ChevronLeft, ChevronRight } from 'lucide-react';
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
      <div className="flex flex-col items-center justify-center h-full text-zinc-500 p-8 text-center my-auto">
        <div className="w-20 h-20 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4">
          <Heart className="w-10 h-10 animate-pulse fill-rose-500/20" />
        </div>
        <p className="text-xl font-extrabold text-zinc-800 dark:text-slate-100">No more profiles nearby</p>
        <p className="text-xs text-zinc-500 dark:text-slate-400 mt-1 max-w-xs">
          You've seen all compatible members in your discovery range. Check back soon or broaden your settings!
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[580px] max-w-md mx-auto flex items-center justify-center perspective-1000 my-auto px-4">
      {cards.map((profile, index) => {
        const isFront = index === cards.length - 1;
        const isSecondCard = index === cards.length - 2;
        return (
          <SwipeCard 
            key={profile.uid} 
            profile={profile} 
            isFront={isFront}
            isSecondCard={isSecondCard}
            onSwipe={(dir) => {
              if (dir === 'left') onSwipeLeft(profile);
              if (dir === 'right') onSwipeRight(profile);
              setCards(prev => prev.slice(0, -1));
            }}
            onReport={() => setReportingProfile(profile)}
          />
        );
      })}

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
  isSecondCard?: boolean;
  onSwipe: (dir: 'left' | 'right') => void;
  onReport: () => void;
}> = ({ profile, isFront, isSecondCard, onSwipe, onReport }) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const [photoIndex, setPhotoIndex] = useState(0);

  const allPhotos = [
    profile.photoUrl || profile.profilePhotoUrl,
    ...(profile.additionalPhotoUrls || [])
  ].filter(Boolean) as string[];

  const handleDragEnd = (event: any, info: any) => {
    const offset = info.offset.x;
    if (offset > 100) {
      onSwipe('right');
    } else if (offset < -100) {
      onSwipe('left');
    }
  };

  const nextPhoto = (e: MouseEvent) => {
    e.stopPropagation();
    if (photoIndex < allPhotos.length - 1) {
      setPhotoIndex(photoIndex + 1);
    }
  };

  const prevPhoto = (e: MouseEvent) => {
    e.stopPropagation();
    if (photoIndex > 0) {
      setPhotoIndex(photoIndex - 1);
    }
  };

  return (
    <motion.div
      className={`absolute w-full h-full bg-white dark:bg-[#1A1A1E] rounded-[40px] shadow-2xl border border-zinc-200 dark:border-white/10 overflow-hidden cursor-grab active:cursor-grabbing group select-none`}
      style={{
        x: isFront ? x : 0,
        rotate: isFront ? rotate : 0,
        opacity: isFront ? 1 : (isSecondCard ? 0.85 : 0),
        scale: isFront ? 1 : (isSecondCard ? 0.95 : 0.9),
        y: isFront ? 0 : (isSecondCard ? 14 : 28),
        zIndex: isFront ? 10 : (isSecondCard ? 5 : 0),
        pointerEvents: isFront ? 'auto' : 'none'
      }}
      drag={isFront ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      initial={false}
      transition={{ duration: 0.3 }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/95 z-10 pointer-events-none" />
      
      {/* Active Photo */}
      <img 
        src={allPhotos[photoIndex] || profile.photoUrl} 
        alt={profile.name} 
        className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none transition-all duration-300" 
      />

      {/* Story-style photo progress bars */}
      {allPhotos.length > 1 && (
        <div className="absolute top-4 left-4 right-4 z-20 flex gap-1.5">
          {allPhotos.map((_, idx) => (
            <div
              key={idx}
              className={`h-1 flex-1 rounded-full transition-all ${
                idx === photoIndex ? 'bg-white shadow' : 'bg-white/30'
              }`}
            />
          ))}
        </div>
      )}

      {/* Photo navigation tap zones */}
      {isFront && allPhotos.length > 1 && (
        <div className="absolute top-0 left-0 right-0 h-1/2 z-20 flex justify-between pointer-events-auto">
          <div
            onClick={prevPhoto}
            className="w-1/2 h-full cursor-pointer opacity-0 hover:opacity-100 flex items-center pl-2 transition"
          >
            {photoIndex > 0 && (
              <div className="p-1.5 rounded-full bg-black/40 text-white backdrop-blur-sm">
                <ChevronLeft className="w-4 h-4" />
              </div>
            )}
          </div>
          <div
            onClick={nextPhoto}
            className="w-1/2 h-full cursor-pointer opacity-0 hover:opacity-100 flex items-center justify-end pr-2 transition"
          >
            {photoIndex < allPhotos.length - 1 && (
              <div className="p-1.5 rounded-full bg-black/40 text-white backdrop-blur-sm">
                <ChevronRight className="w-4 h-4" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top action overlay for report button */}
      {isFront && (
        <div className="absolute top-8 right-5 z-30 pointer-events-auto">
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
      <div className="absolute bottom-0 left-0 right-0 p-7 z-20 text-white pointer-events-none">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {profile.firstName || profile.name}{profile.age ? `, ${profile.age}` : ''}
            </h2>
            {profile.isVerified && <VerifiedBadge size="md" />}
          </div>

          {(profile.gender || profile.location?.city || profile.preferences?.lookingFor) && (
            <p className="text-xs text-white/90 font-medium mb-2.5 flex items-center gap-2">
              {profile.gender && <span>{profile.gender}</span>}
              {profile.location?.city && (
                <>
                  <span>•</span>
                  <span>{profile.location.city}</span>
                </>
              )}
              {profile.preferences?.lookingFor && (
                <>
                  <span>•</span>
                  <span className="text-rose-300 font-semibold">{profile.preferences.lookingFor}</span>
                </>
              )}
            </p>
          )}
          
          <p className="text-slate-200 text-xs sm:text-sm mb-3.5 leading-relaxed line-clamp-2">
            {profile.bio || "Looking for great conversations and meaningful connection."}
          </p>

          <div className="flex flex-wrap gap-1.5 mb-2">
            {profile.interests?.slice(0, 4).map(interest => (
              <span key={interest} className="px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-full text-[11px] font-medium">
                {interest}
              </span>
            ))}
            {(profile.interests?.length || 0) > 4 && (
              <span className="px-2 py-1 bg-white/10 backdrop-blur-md rounded-full text-[11px] font-medium">
                +{(profile.interests?.length || 0) - 4}
              </span>
            )}
          </div>
      </div>

      {/* Swipe Feedback badges (Like / Nope) */}
      {isFront && (
        <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 flex justify-between px-6 pointer-events-none z-30">
           <motion.div 
             className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-rose-500 shadow-xl border border-rose-200"
             style={{ opacity: useTransform(x, [-100, -40], [1, 0]) }}
           >
             <X className="w-8 h-8" />
           </motion.div>
           <motion.div 
             className="w-16 h-16 bg-rose-500 rounded-full flex items-center justify-center text-white shadow-xl"
             style={{ opacity: useTransform(x, [40, 100], [0, 1]) }}
           >
             <Heart className="w-8 h-8 fill-current" />
           </motion.div>
        </div>
      )}
    </motion.div>
  );
}
