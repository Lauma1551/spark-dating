export type UserProfile = {
  uid: string;
  firstName?: string;
  name: string; // Display name
  dateOfBirth?: string; // YYYY-MM-DD
  age?: number;
  gender?: 'Woman' | 'Man' | 'Non-binary' | 'Other' | string;
  datingPreference?: 'Everyone' | 'Men' | 'Women' | string;
  interestedIn?: 'Everyone' | 'Men' | 'Women' | string; // Kept in sync with datingPreference
  preferences?: {
    minAge?: number;
    maxAge?: number;
    lookingFor?: 'Relationship' | 'Casual' | 'Friendship' | 'Something serious' | string;
    maxDistanceKm?: number;
  };
  bio: string;
  interests: string[];
  photoUrl: string; // Primary profile photo URL
  profilePhotoUrl?: string; // Synonym for photoUrl
  additionalPhotoUrls?: string[];
  location: {
    lat?: number;
    lng?: number;
    city?: string;
  } | null;
  profileCompleted: boolean;
  createdAt: number;
  updatedAt?: number;
  lastSeen?: number;
  blockedUserIds?: string[];
  isVerified?: boolean;
  verificationPhotoUrl?: string;
  verifiedAt?: number;
  subscriptionPlan?: 'weekly' | 'half_month' | 'monthly' | 'yearly';
  subscriptionExpiresAt?: number;
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
