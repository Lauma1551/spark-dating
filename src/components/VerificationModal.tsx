import { useState, useRef } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { UserProfile } from '../types';
import { VerifiedBadge } from './VerifiedBadge';
import { X, Check, ShieldCheck, Camera, CreditCard, Sparkles, Loader2, ArrowRight, Upload, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type VerificationModalProps = {
  currentUser: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onVerified: (updatedProfile: UserProfile) => void;
};

type PlanOption = {
  id: 'weekly' | 'half_month' | 'monthly' | 'yearly';
  name: string;
  duration: string;
  price: string;
  priceNum: number;
  perDay: string;
  days: number;
  popular?: boolean;
  savings?: string;
};

const PLAN_OPTIONS: PlanOption[] = [
  {
    id: 'weekly',
    name: 'Weekly',
    duration: '1 Week',
    price: '$2.99',
    priceNum: 2.99,
    perDay: '$0.42/day',
    days: 7,
  },
  {
    id: 'half_month',
    name: 'Half Month',
    duration: '15 Days',
    price: '$4.99',
    priceNum: 4.99,
    perDay: '$0.33/day',
    days: 15,
    savings: 'Save 20%'
  },
  {
    id: 'monthly',
    name: 'Monthly',
    duration: '1 Month',
    price: '$7.99',
    priceNum: 7.99,
    perDay: '$0.26/day',
    days: 30,
    popular: true,
    savings: 'Save 35%'
  },
  {
    id: 'yearly',
    name: 'Yearly',
    duration: '1 Year',
    price: '$49.99',
    priceNum: 49.99,
    perDay: '$0.13/day',
    days: 365,
    savings: 'Save 55%'
  }
];

export function VerificationModal({ currentUser, isOpen, onClose, onVerified }: VerificationModalProps) {
  const [step, setStep] = useState<'plan' | 'photo' | 'payment' | 'success'>('plan');
  const [selectedPlan, setSelectedPlan] = useState<PlanOption>(PLAN_OPTIONS[2]); // Default Monthly
  const [verificationPhoto, setVerificationPhoto] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState('');
  
  // Payment mock state
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('888');
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handlePhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setPhotoError('Photo size must be under 5MB');
        return;
      }
      setPhotoError('');
      const reader = new FileReader();
      reader.onloadend = () => {
        setVerificationPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCompleteVerification = async (e: FormEvent) => {
    e.preventDefault();
    if (!verificationPhoto) {
      setPhotoError('Please upload a selfie photo to verify');
      setStep('photo');
      return;
    }

    setSubmitting(true);

    try {
      const now = Date.now();
      const expiresAt = now + (selectedPlan.days * 24 * 60 * 60 * 1000);

      const updatedFields = {
        isVerified: true,
        verifiedAt: now,
        verificationPhotoUrl: verificationPhoto,
        subscriptionPlan: selectedPlan.id,
        subscriptionExpiresAt: expiresAt,
      };

      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, updatedFields);

      const updatedProfile: UserProfile = {
        ...currentUser,
        ...updatedFields
      };

      onVerified(updatedProfile);
      setStep('success');
    } catch (err) {
      console.error('Error completing verification:', err);
      setPhotoError('Failed to save verification. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-lg bg-white dark:bg-[#18181C] border border-zinc-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative text-zinc-900 dark:text-slate-100 my-8"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-slate-200 rounded-full hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Stepper header */}
          {step !== 'success' && (
            <div className="flex items-center justify-center gap-2 mb-6">
              {(['plan', 'photo', 'payment'] as const).map((s, idx) => {
                const isActive = step === s;
                const isDone = 
                  (s === 'plan' && step !== 'plan') ||
                  (s === 'photo' && step === 'payment');
                
                return (
                  <div key={s} className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isDone
                          ? 'bg-blue-500 text-white'
                          : isActive
                          ? 'bg-blue-500/20 text-blue-500 ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-[#18181C]'
                          : 'bg-zinc-100 dark:bg-white/5 text-zinc-400'
                      }`}
                    >
                      {isDone ? <Check className="w-4 h-4 stroke-[3]" /> : idx + 1}
                    </div>
                    {idx < 2 && <div className={`w-8 h-0.5 ${isDone ? 'bg-blue-500' : 'bg-zinc-200 dark:bg-white/10'}`} />}
                  </div>
                );
              })}
            </div>
          )}

          {/* STEP 1: SELECT PLAN */}
          {step === 'plan' && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-xs font-semibold">
                  <ShieldCheck className="w-4 h-4" />
                  Profile Verification
                </div>
                <h2 className="text-2xl font-bold tracking-tight">Get Your Verified Badge</h2>
                <p className="text-xs text-zinc-500 dark:text-slate-400 max-w-sm mx-auto">
                  Stand out with an official blue checkmark, prove authenticity, and boost your matches up to 3x.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {PLAN_OPTIONS.map((plan) => {
                  const isSelected = selectedPlan.id === plan.id;
                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan)}
                      className={`relative p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-blue-500 bg-blue-500/5 dark:bg-blue-500/10 shadow-lg shadow-blue-500/10'
                          : 'border-zinc-200 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20 bg-zinc-50/50 dark:bg-white/5'
                      }`}
                    >
                      {plan.popular && (
                        <div className="absolute -top-2.5 right-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full shadow-sm">
                          Most Popular
                        </div>
                      )}
                      {plan.savings && !plan.popular && (
                        <div className="absolute -top-2.5 right-3 bg-emerald-500 text-white text-[9px] font-bold uppercase px-2 py-0.5 rounded-full shadow-sm">
                          {plan.savings}
                        </div>
                      )}

                      <div>
                        <span className="text-xs font-bold text-zinc-500 dark:text-slate-400 block mb-1 uppercase tracking-wider">
                          {plan.name}
                        </span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-extrabold">{plan.price}</span>
                          <span className="text-[10px] text-zinc-400">/ {plan.duration}</span>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-zinc-200/50 dark:border-white/5 flex items-center justify-between text-[11px] text-zinc-500 dark:text-slate-400 font-medium">
                        <span>{plan.perDay}</span>
                        {isSelected && <VerifiedBadge size="sm" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-3.5 bg-blue-500/10 rounded-2xl border border-blue-500/20 text-xs space-y-1.5 text-blue-900 dark:text-blue-200">
                <div className="flex items-center gap-2 font-semibold text-blue-600 dark:text-blue-400">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>Verification Perks Included:</span>
                </div>
                <ul className="grid grid-cols-2 gap-1.5 text-[11px] opacity-90 pl-1">
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-blue-500 shrink-0" /> Official Blue Badge
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-blue-500 shrink-0" /> Higher Visibility
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-blue-500 shrink-0" /> Safety & Trust Seal
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-blue-500 shrink-0" /> Cancel Anytime
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => setStep('photo')}
                className="w-full py-3.5 px-6 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl font-semibold text-sm hover:from-blue-600 hover:to-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
              >
                <span>Continue to Photo Upload</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 2: PHOTO UPLOAD */}
          {step === 'photo' && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-xs font-semibold">
                  <Camera className="w-4 h-4" />
                  Selfie Photo Verification
                </div>
                <h2 className="text-2xl font-bold tracking-tight">Upload Verification Photo</h2>
                <p className="text-xs text-zinc-500 dark:text-slate-400 max-w-xs mx-auto">
                  Take or upload a clear photo of yourself to confirm your identity matches your profile photo.
                </p>
              </div>

              {photoError && (
                <div className="p-3 text-xs bg-rose-500/10 text-rose-500 rounded-xl border border-rose-500/20 text-center font-medium">
                  {photoError}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[220px] ${
                  verificationPhoto
                    ? 'border-blue-500 bg-blue-500/5'
                    : 'border-zinc-300 dark:border-white/15 hover:border-blue-400 bg-zinc-50/50 dark:bg-white/5'
                }`}
              >
                {verificationPhoto ? (
                  <div className="relative w-36 h-36 rounded-full overflow-hidden border-4 border-blue-500 shadow-xl group">
                    <img
                      src={verificationPhoto}
                      alt="Verification selfie"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-semibold transition-opacity">
                      Change Photo
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 flex flex-col items-center">
                    <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                      <Upload className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Click to upload selfie</p>
                      <p className="text-[11px] text-zinc-400 mt-1">PNG, JPG or WEBP up to 5MB</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep('plan')}
                  className="w-1/3 py-3.5 px-4 text-xs font-semibold text-zinc-600 dark:text-slate-400 bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 rounded-2xl transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={!verificationPhoto}
                  onClick={() => {
                    if (!verificationPhoto) {
                      setPhotoError('Please select or take a photo first');
                      return;
                    }
                    setStep('payment');
                  }}
                  className="w-2/3 py-3.5 px-6 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl font-semibold text-sm hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
                >
                  <span>Proceed to Payment</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PAYMENT */}
          {step === 'payment' && (
            <form onSubmit={handleCompleteVerification} className="space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-xs font-semibold">
                  <CreditCard className="w-4 h-4" />
                  Subscription Checkout
                </div>
                <h2 className="text-2xl font-bold tracking-tight">Complete Verification Payment</h2>
              </div>

              {/* Order Summary */}
              <div className="p-4 bg-zinc-50 dark:bg-white/5 rounded-2xl border border-zinc-200 dark:border-white/10 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500 dark:text-slate-400 font-medium">Selected Tier:</span>
                  <span className="font-bold">{selectedPlan.name} Plan ({selectedPlan.duration})</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500 dark:text-slate-400 font-medium">Verification Fee:</span>
                  <span className="font-semibold text-emerald-500">Free</span>
                </div>
                <div className="pt-2 border-t border-zinc-200 dark:border-white/10 flex justify-between items-center">
                  <span className="text-sm font-bold">Total Due Now:</span>
                  <span className="text-lg font-black text-blue-500">{selectedPlan.price}</span>
                </div>
              </div>

              {/* Payment Details Form */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-slate-400">
                    Card Number
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      required
                      className="w-full pl-10 pr-3 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                    <CreditCard className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-slate-400">
                      Expiration
                    </label>
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      placeholder="MM/YY"
                      required
                      className="w-full px-3 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-slate-400">
                      CVC / CVV
                    </label>
                    <input
                      type="text"
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value)}
                      placeholder="123"
                      required
                      className="w-full px-3 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-zinc-400 justify-center">
                <Lock className="w-3.5 h-3.5 text-emerald-500" />
                <span>256-bit encrypted secure checkout. Cancel anytime.</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep('photo')}
                  className="w-1/3 py-3.5 px-4 text-xs font-semibold text-zinc-600 dark:text-slate-400 bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 rounded-2xl transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-2/3 py-3.5 px-6 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl font-semibold text-sm hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      Pay {selectedPlan.price} & Get Verified
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 4: SUCCESS */}
          {step === 'success' && (
            <div className="py-6 text-center space-y-6">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-2xl shadow-blue-500/40 relative"
              >
                <Check className="w-10 h-10 stroke-[3]" />
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0 rounded-full border-2 border-dashed border-white/40"
                />
              </motion.div>

              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <h2 className="text-2xl font-bold">You are Verified!</h2>
                  <VerifiedBadge size="lg" />
                </div>
                <p className="text-xs text-zinc-500 dark:text-slate-400 max-w-xs mx-auto">
                  Your profile now displays the official blue checkmark badge. Your subscription is active for the <span className="font-semibold text-blue-500">{selectedPlan.name}</span> plan.
                </p>
              </div>

              <div className="p-4 bg-zinc-50 dark:bg-white/5 rounded-2xl border border-zinc-200 dark:border-white/10 text-xs text-left space-y-2">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Status:</span>
                  <span className="font-bold text-emerald-500">Verified Member</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Plan:</span>
                  <span className="font-semibold capitalize">{selectedPlan.name} ({selectedPlan.price})</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3.5 px-6 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl font-semibold text-sm hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25"
              >
                Done & Return to App
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
