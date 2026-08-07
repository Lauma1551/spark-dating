import { useEffect, useState } from 'react';
import { db, messaging } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { getToken, onMessage } from 'firebase/messaging';
import { UserProfile, Match } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { HeartPulse, X } from 'lucide-react';

export function NotificationManager({ currentUser }: { currentUser: UserProfile }) {
  const [notification, setNotification] = useState<{ title: string; body: string; image?: string } | null>(null);

  useEffect(() => {
    // 1. Setup Firebase Cloud Messaging (FCM)
    const setupFCM = async () => {
      if (!messaging) return;
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          // In a production app, you would pass your VAPID key here:
          // const token = await getToken(messaging, { vapidKey: 'YOUR_VAPID_KEY' });
          // Then save this token to the user's Firestore profile to send server-side pushes.
          
          onMessage(messaging, (payload) => {
            setNotification({
              title: payload.notification?.title || 'New Match!',
              body: payload.notification?.body || 'Someone matched with you.',
              image: payload.notification?.image
            });
            setTimeout(() => setNotification(null), 5000);
          });
        }
      } catch (error) {
        console.log("FCM Setup Note: Notifications might be blocked in this sandbox environment.", error);
      }
    };
    
    setupFCM();

    // 2. Fallback / Immediate In-App Real-time Notification using Firestore
    const startTime = Date.now();
    const q = query(
      collection(db, 'matches'),
      where('users', 'array-contains', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const matchData = change.doc.data() as Match;
          // Only show notification for matches that occurred AFTER we mounted
          if (matchData.createdAt > startTime) {
            setNotification({
              title: "It's a Match! 🎉",
              body: "You have a new connection waiting in your matches tab.",
            });
            setTimeout(() => setNotification(null), 6000);
          }
        }
      });
    });

    return () => unsubscribe();
  }, [currentUser.uid]);

  return (
    <AnimatePresence>
      {notification && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm bg-[#1A1A1E] border border-white/10 shadow-2xl rounded-2xl p-4 flex items-start gap-4 text-slate-100 font-sans"
        >
          <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0 border border-rose-500/30">
            <HeartPulse className="w-5 h-5 text-rose-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-sm mb-1 text-white">{notification.title}</h4>
            <p className="text-xs text-slate-400 leading-relaxed">{notification.body}</p>
          </div>
          <button 
            onClick={() => setNotification(null)}
            className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
