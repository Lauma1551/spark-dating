import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { UserProfile } from '../types';
import { Flag, X, CheckCircle2, ShieldAlert, Loader2, Ban } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type ReportModalProps = {
  reportedUser: { uid: string; name: string };
  reporterUser: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onUserBlocked?: (blockedUid: string) => void;
  initialMode?: 'report' | 'block';
};

const REPORT_REASONS = [
  'Inappropriate or offensive photos',
  'Harassment or rude behavior',
  'Fake profile or impersonation',
  'Spam or commercial advertising',
  'Safety or scam concern',
  'Other'
];

export function ReportModal({ reportedUser, reporterUser, isOpen, onClose, onUserBlocked, initialMode = 'report' }: ReportModalProps) {
  const [mode, setMode] = useState<'report' | 'block'>(initialMode);
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedAction, setSubmittedAction] = useState<string>('Report Submitted');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setSubmitted(false);
      setError('');
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleBlockUser = async () => {
    setSubmitting(true);
    setError('');

    try {
      // 1. Record block in blocks collection
      await addDoc(collection(db, 'blocks'), {
        blockerId: reporterUser.uid,
        blockedId: reportedUser.uid,
        createdAt: Date.now()
      });

      // 2. Add to user's blockedUserIds array in Firestore
      const userRef = doc(db, 'users', reporterUser.uid);
      await updateDoc(userRef, {
        blockedUserIds: arrayUnion(reportedUser.uid)
      });

      // 3. Callback for local state update
      onUserBlocked?.(reportedUser.uid);

      setSubmittedAction('User Blocked');
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Error blocking user:', err);
      setError('Failed to block user. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await addDoc(collection(db, 'reports'), {
        reporterId: reporterUser.uid,
        reporterName: reporterUser.name,
        reportedUserId: reportedUser.uid,
        reportedUserName: reportedUser.name,
        reason,
        details: details.trim(),
        createdAt: Date.now(),
        status: 'pending'
      });

      if (alsoBlock) {
        // Block as well
        await addDoc(collection(db, 'blocks'), {
          blockerId: reporterUser.uid,
          blockedId: reportedUser.uid,
          createdAt: Date.now()
        });

        const userRef = doc(db, 'users', reporterUser.uid);
        await updateDoc(userRef, {
          blockedUserIds: arrayUnion(reportedUser.uid)
        });

        onUserBlocked?.(reportedUser.uid);
        setSubmittedAction('Reported & Blocked');
      } else {
        setSubmittedAction('Report Submitted');
      }

      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Error submitting report:', err);
      setError('Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-md bg-white dark:bg-[#1A1A1E] border border-zinc-200 dark:border-white/10 rounded-3xl p-6 shadow-2xl relative text-zinc-900 dark:text-slate-100"
        >
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-slate-200 rounded-full hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {submitted ? (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold">{submittedAction}</h3>
              <p className="text-sm text-zinc-500 dark:text-slate-400 max-w-xs">
                {alsoBlock || mode === 'block'
                  ? `${reportedUser.name} has been blocked and will no longer appear in your matches or discover feed.`
                  : 'Thank you for notifying us. We take community safety seriously and will review your report shortly.'}
              </p>
            </div>
          ) : mode === 'block' ? (
            <div className="space-y-5">
              <div className="flex items-center gap-3 pr-8">
                <div className="p-2.5 bg-rose-500/10 text-rose-500 rounded-2xl">
                  <Ban className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold leading-tight">Block {reportedUser.name}?</h3>
                  <p className="text-xs text-zinc-500 dark:text-slate-400">Prevent future interactions</p>
                </div>
              </div>

              <p className="text-xs text-zinc-600 dark:text-slate-300 leading-relaxed bg-zinc-50 dark:bg-white/5 p-3.5 rounded-2xl border border-zinc-200/50 dark:border-white/5">
                Blocking {reportedUser.name} will remove them from your matches and prevent them from showing up in your potential matches. They will not be notified that you blocked them.
              </p>

              {error && (
                <div className="p-3 text-xs bg-rose-500/10 text-rose-500 rounded-xl border border-rose-500/20">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMode('report')}
                  className="text-xs font-medium text-rose-500 hover:underline"
                >
                  Report profile instead
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-slate-400 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleBlockUser}
                    disabled={submitting}
                    className="flex items-center gap-2 px-5 py-2 text-xs font-semibold bg-rose-500 text-white rounded-xl hover:bg-rose-600 disabled:opacity-50 transition-colors shadow-md shadow-rose-500/20"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Blocking...
                      </>
                    ) : (
                      <>
                        <Ban className="w-3.5 h-3.5" />
                        Confirm Block
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-3 pr-8">
                <div className="p-2.5 bg-rose-500/10 text-rose-500 rounded-2xl">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold leading-tight">Report {reportedUser.name}</h3>
                  <p className="text-xs text-zinc-500 dark:text-slate-400">Help us keep the platform safe</p>
                </div>
              </div>

              {error && (
                <div className="p-3 text-xs bg-rose-500/10 text-rose-500 rounded-xl border border-rose-500/20">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-slate-400">
                  Reason for report
                </label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {REPORT_REASONS.map((r) => (
                    <label
                      key={r}
                      className={`flex items-center gap-3 p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                        reason === r
                          ? 'border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400 font-medium'
                          : 'border-zinc-200 dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-white/5 text-zinc-700 dark:text-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="reason"
                        value={r}
                        checked={reason === r}
                        onChange={() => setReason(r)}
                        className="accent-rose-500"
                      />
                      <span>{r}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-slate-400">
                  Additional Details (Optional)
                </label>
                <textarea
                  rows={2}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Describe what happened or provide specific details..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-rose-500/50 text-zinc-900 dark:text-slate-100 placeholder-zinc-400 dark:placeholder-slate-500 resize-none"
                />
              </div>

              <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-rose-500/20 bg-rose-500/5 text-xs text-zinc-800 dark:text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={alsoBlock}
                  onChange={(e) => setAlsoBlock(e.target.checked)}
                  className="accent-rose-500 rounded"
                />
                <span>Also block {reportedUser.name} from seeing your profile</span>
              </label>

              <div className="flex items-center justify-between gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMode('block')}
                  className="text-xs font-medium text-rose-500 hover:underline flex items-center gap-1"
                >
                  <Ban className="w-3.5 h-3.5" />
                  Block only
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-slate-400 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 px-5 py-2 text-xs font-semibold bg-rose-500 text-white rounded-xl hover:bg-rose-600 disabled:opacity-50 transition-colors shadow-md shadow-rose-500/20"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Flag className="w-3.5 h-3.5" />
                        Submit Report
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

