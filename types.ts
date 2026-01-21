
export enum AppView {
  LOGIN = 'LOGIN',
  CHAT = 'CHAT',
  VOICE = 'VOICE',
  MAPS = 'MAPS',
  TIMER = 'TIMER',
  HISTORY = 'HISTORY'
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  createdAt: string; // ISO Date
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  lastModified: Date;
}

export interface MentalMapItem {
  id: string;
  topic: string;
  content: string;
  createdAt: Date;
}

export interface TimerState {
  minutes: number;
  seconds: number;
  isActive: boolean;
  mode: 'FOCUS' | 'BREAK' | 'FREE';
  deliverable?: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: Date;
}

export interface UserStats {
  userId: string; // Added for auth association
  points: number;
  level: number;
  streak: number;
  achievements: Achievement[];
}
