export type UserProfile = {
  uid: string;
  name: string;
  bio: string;
  interests: string[];
  photoUrl: string;
  location: {
    lat: number;
    lng: number;
  } | null;
  lastSeen?: number;
  blockedUserIds?: string[];
  isVerified?: boolean;
  verificationPhotoUrl?: string;
  verifiedAt?: number;
  subscriptionPlan?: 'weekly' | 'half_month' | 'monthly' | 'yearly';
  subscriptionExpiresAt?: number;
  createdAt: number;
};

export type Match = {
  id: string;
  users: string[]; // [uid1, uid2]
  createdAt: number;
  lastMessage?: string;
  lastMessageTime?: number;
};

export type Message = {
  id: string;
  matchId: string;
  senderId: string;
  text: string;
  createdAt: number;
};
