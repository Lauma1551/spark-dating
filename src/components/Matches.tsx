import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { UserProfile, Match, Message } from '../types';
import { Send, ArrowLeft, HeartPulse, Search, Flag, Ban } from 'lucide-react';
import { ReportModal } from './ReportModal';
import { VerifiedBadge } from './VerifiedBadge';

export function Matches({ currentUser }: { currentUser: UserProfile }) {
  const [matches, setMatches] = useState<(Match & { otherUser?: UserProfile })[]>([]);
  const [activeMatch, setActiveMatch] = useState<(Match & { otherUser?: UserProfile }) | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [blockedUids, setBlockedUids] = useState<string[]>(currentUser.blockedUserIds || []);

  useEffect(() => {
    setBlockedUids(currentUser.blockedUserIds || []);
  }, [currentUser.blockedUserIds]);

  useEffect(() => {
    const q = query(
      collection(db, 'matches'),
      where('users', 'array-contains', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const matchPromises = snapshot.docs.map(async (matchDoc) => {
        const data = matchDoc.data() as Match;
        const otherUserId = data.users.find(id => id !== currentUser.uid);
        let otherUser: UserProfile | undefined = undefined;
        if (otherUserId) {
           const userSnap = await getDoc(doc(db, 'users', otherUserId));
           if (userSnap.exists()) {
             otherUser = userSnap.data() as UserProfile;
           }
        }
        return { ...data, id: matchDoc.id, otherUser };
      });
      const resolvedMatches = await Promise.all(matchPromises);
      setMatches(resolvedMatches.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0)));
    });

    return () => unsubscribe();
  }, [currentUser.uid]);

  const handleUserBlocked = (blockedUid: string) => {
    setBlockedUids(prev => [...prev, blockedUid]);
    setMatches(prev => prev.filter(m => m.otherUser?.uid !== blockedUid));
    if (activeMatch?.otherUser?.uid === blockedUid) {
      setActiveMatch(null);
    }
  };

  if (activeMatch && activeMatch.otherUser) {
    return (
      <ChatRoom 
        match={activeMatch} 
        currentUser={currentUser} 
        onBack={() => setActiveMatch(null)} 
        onUserBlocked={handleUserBlocked}
      />
    );
  }

  const filteredMatches = matches.filter(match => {
    if (!match.otherUser) return false;
    if (blockedUids.includes(match.otherUser.uid)) return false;
    if (match.otherUser.blockedUserIds?.includes(currentUser.uid)) return false;
    if (!searchQuery.trim()) return true;
    return match.otherUser?.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const formatLastSeen = (lastSeen?: number) => {
    if (!lastSeen) return 'Offline';
    const diff = Date.now() - lastSeen;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 5) return 'Online';
    if (minutes < 60) return `Active ${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Active ${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `Active ${days}d ago`;
  };

  const isOnline = (lastSeen?: number) => {
    if (!lastSeen) return false;
    return (Date.now() - lastSeen) < (5 * 60 * 1000);
  };

  return (
    <div className="w-full h-full max-w-2xl mx-auto flex flex-col bg-white dark:bg-[#121216] border border-zinc-200 dark:border-white/5 rounded-[40px] shadow-2xl overflow-hidden min-h-[600px]">
      <div className="p-6 border-b border-zinc-100 dark:border-white/5 flex flex-col gap-4">
        <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-slate-100 flex items-center gap-2">
          Your Matches
        </h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search matches..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-100 dark:bg-white/5 border border-transparent focus:border-rose-500/50 dark:focus:border-rose-500/50 rounded-xl text-sm outline-none transition-colors text-zinc-900 dark:text-slate-100 placeholder-zinc-500 dark:placeholder-slate-400 focus:bg-white dark:focus:bg-[#1A1A1E]"
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredMatches.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500 dark:text-slate-500">
            {searchQuery.trim() ? (
              <p>No matches found for "{searchQuery}".</p>
            ) : (
              <>
                <p>No matches yet.</p>
                <p className="text-sm">Keep swiping!</p>
              </>
            )}
          </div>
        ) : (
          filteredMatches.map(match => (
            <div 
              key={match.id} 
              onClick={() => setActiveMatch(match)}
              className="flex items-center gap-4 p-4 rounded-2xl hover:bg-zinc-50 dark:hover:bg-white/5 border border-transparent dark:hover:border-white/10 transition-colors cursor-pointer group"
            >
              <div className="relative">
                <img 
                  src={match.otherUser?.photoUrl || `https://ui-avatars.com/api/?name=Unknown`} 
                  alt="Profile" 
                  className="w-14 h-14 rounded-full object-cover shadow-sm bg-slate-800"
                />
                {isOnline(match.otherUser?.lastSeen) && (
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white dark:border-[#121216]"></div>
                )}
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="flex justify-between items-baseline mb-1">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-semibold text-zinc-900 dark:text-slate-100 group-hover:text-rose-500 transition-colors truncate">{match.otherUser?.name || 'Unknown User'}</span>
                    {match.otherUser?.isVerified && <VerifiedBadge size="sm" />}
                  </div>
                  <span className="text-[10px] text-zinc-500 dark:text-slate-500 font-medium uppercase tracking-wider shrink-0 ml-2">
                    {isOnline(match.otherUser?.lastSeen) ? 'Online' : formatLastSeen(match.otherUser?.lastSeen)}
                  </span>
                </div>
                <p className="text-sm text-zinc-500 dark:text-slate-400 truncate">
                  {match.lastMessage || 'Say hi!'}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ChatRoom({ match, currentUser, onBack, onUserBlocked }: { match: Match & { otherUser: UserProfile }, currentUser: UserProfile, onBack: () => void, onUserBlocked?: (uid: string) => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [reportModalState, setReportModalState] = useState<{ isOpen: boolean; mode: 'report' | 'block' }>({ isOpen: false, mode: 'report' });

  useEffect(() => {
    const q = query(
      collection(db, 'messages'),
      where('matchId', '==', match.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      msgs.sort((a, b) => a.createdAt - b.createdAt);
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [match.id]);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    const msgText = text.trim();
    setText('');
    
    await addDoc(collection(db, 'messages'), {
      matchId: match.id,
      senderId: currentUser.uid,
      text: msgText,
      createdAt: Date.now()
    });

    await updateDoc(doc(db, 'matches', match.id), {
      lastMessage: msgText,
      lastMessageTime: Date.now()
    });
  };

  const handleUserBlockedInternal = (blockedUid: string) => {
    onUserBlocked?.(blockedUid);
    onBack();
  };

  const isOnline = (lastSeen?: number) => {
    if (!lastSeen) return false;
    return (Date.now() - lastSeen) < (5 * 60 * 1000);
  };

  const formatLastSeen = (lastSeen?: number) => {
    if (!lastSeen) return 'Offline';
    const diff = Date.now() - lastSeen;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 5) return 'Online';
    if (minutes < 60) return `Active ${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Active ${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `Active ${days}d ago`;
  };

  return (
    <div className="w-full h-full max-w-2xl mx-auto flex flex-col bg-white dark:bg-[#121216] border border-zinc-200 dark:border-white/5 rounded-[40px] shadow-2xl overflow-hidden min-h-[600px]">
      <div className="p-4 border-b border-zinc-100 dark:border-white/5 flex items-center justify-between bg-white/5">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-zinc-100 dark:hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-zinc-600 dark:text-slate-300" />
          </button>
          <div className="relative">
            <img 
              src={match.otherUser.photoUrl} 
              alt={match.otherUser.name}
              className="w-10 h-10 rounded-full object-cover"
            />
            {isOnline(match.otherUser.lastSeen) && (
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-[#121216]"></div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-zinc-900 dark:text-slate-100 leading-tight">{match.otherUser.name}</h3>
              {match.otherUser.isVerified && <VerifiedBadge size="sm" />}
            </div>
            <p className="text-[10px] text-zinc-500 dark:text-slate-500 font-medium">
              {isOnline(match.otherUser.lastSeen) ? 'Online now' : formatLastSeen(match.otherUser.lastSeen)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setReportModalState({ isOpen: true, mode: 'block' })}
            title="Block User"
            className="p-2 hover:bg-rose-500/10 text-zinc-400 hover:text-rose-500 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-medium"
          >
            <Ban className="w-4 h-4" />
            <span className="hidden sm:inline">Block</span>
          </button>
          <button
            onClick={() => setReportModalState({ isOpen: true, mode: 'report' })}
            title="Report User"
            className="p-2 hover:bg-rose-500/10 text-zinc-400 hover:text-rose-500 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-medium"
          >
            <Flag className="w-4 h-4" />
            <span className="hidden sm:inline">Report</span>
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-zinc-50 dark:bg-[#09090B]">
        {messages.map(msg => {
          const isMe = msg.senderId === currentUser.uid;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`max-w-[75%] px-5 py-3 rounded-2xl text-sm shadow-sm ${
                  isMe 
                    ? 'bg-gradient-to-tr from-rose-500 to-violet-600 text-white rounded-br-sm' 
                    : 'bg-white dark:bg-white/10 text-zinc-900 dark:text-slate-100 rounded-bl-sm border border-zinc-200 dark:border-white/5'
                }`}
              >
                {msg.text}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-4 bg-white dark:bg-black/20 text-center border-t border-zinc-100 dark:border-white/5">
        <div className="flex items-center justify-center gap-2 text-zinc-500 dark:text-slate-500 text-[10px] font-bold tracking-widest mb-4">
          <svg className="w-3 h-3 text-emerald-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>
          END-TO-END ENCRYPTED CHAT
        </div>
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input 
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-5 py-3 rounded-full border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-zinc-900 dark:text-slate-100 placeholder-zinc-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all text-sm"
          />
          <button 
            type="submit"
            disabled={!text.trim()}
            className="p-3 bg-rose-500 text-white rounded-full hover:bg-rose-600 disabled:opacity-50 transition-colors shadow-lg shadow-rose-500/20"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>

      <ReportModal
        reportedUser={{ uid: match.otherUser.uid, name: match.otherUser.name }}
        reporterUser={currentUser}
        isOpen={reportModalState.isOpen}
        initialMode={reportModalState.mode}
        onClose={() => setReportModalState(prev => ({ ...prev, isOpen: false }))}
        onUserBlocked={handleUserBlockedInternal}
      />
    </div>
  );
}
