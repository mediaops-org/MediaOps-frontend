import type { AutopilotJob, ReelOrigin } from "./types";
import type { User } from "./auth-types";

export type Reel = {
  id: string;
  title: string;
  duration: string;
  thumbnailHue?: string | number; // for visual variety
  videoUrl?: string;
  artifactPath?: string;
  thumbnailUrl?: string | null;
  creator?: { name: string; handle: string; avatarUrl?: string; avatarHue?: number };
  tags?: string[];
  published?: boolean;
  origin?: ReelOrigin;
  createdAt?: string | number | Date;
};

export type Message =
  | { id: string; role: "user"; text: string; createdAt: number }
  | { id: string; role: "ai"; reel: Reel; createdAt: number };

export type Session = {
  id: string;
  title: string;
  createdAt: number;
  messages: Message[];
};

const r = (n: number) => Math.floor(Math.random() * n);

export const initialSessions: Session[] = [
  {
    id: "s1",
    title: "Brand teaser — Q2",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
    messages: [
      { id: "m1", role: "user", text: "Make a cinematic 15s teaser for our spring product drop, neon vibe.", createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2 },
      { id: "m2", role: "ai", reel: { id: "r1", title: "Spring Drop — Neon Teaser", duration: "0:15", thumbnailHue: 195, origin: "prompt", published: true }, createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2 + 4000 },
    ],
  },
  {
    id: "s2",
    title: "Travel diary — Lisbon",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 5,
    messages: [
      { id: "m3", role: "user", text: "Lisbon trip recap, golden hour, handheld feel, 30 seconds.", createdAt: Date.now() - 1000 * 60 * 60 * 24 * 5 },
      { id: "m4", role: "ai", reel: { id: "r2", title: "Lisbon — Golden Hour Diary", duration: "0:30", thumbnailHue: 35, origin: "prompt", published: false }, createdAt: Date.now() - 1000 * 60 * 60 * 24 * 5 + 5000 },
      { id: "m5", role: "user", text: "Make another version with slower pacing.", createdAt: Date.now() - 1000 * 60 * 60 * 24 * 5 + 60000 },
      { id: "m6", role: "ai", reel: { id: "r3", title: "Lisbon — Slow Cut", duration: "0:42", thumbnailHue: 25, origin: "prompt", published: false }, createdAt: Date.now() - 1000 * 60 * 60 * 24 * 5 + 65000 },
    ],
  },
  {
    id: "s3",
    title: "Untitled Reel #3",
    createdAt: Date.now() - 1000 * 60 * 60 * 8,
    messages: [
      { id: "m7", role: "user", text: "Tutorial intro for a coding channel, dark theme, energetic.", createdAt: Date.now() - 1000 * 60 * 60 * 8 },
      { id: "m8", role: "ai", reel: { id: "r4", title: "Coding Intro — Dark Energy", duration: "0:08", thumbnailHue: 280, origin: "prompt", published: true }, createdAt: Date.now() - 1000 * 60 * 60 * 8 + 3500 },
    ],
  },
  {
    id: "s-ap-1",
    title: "Autopilot · Tech digest",
    createdAt: Date.now() - 1000 * 60 * 60 * 12,
    messages: [
      { id: "ap1", role: "ai", reel: { id: "rap1", title: "Tech Daily — AI breakthroughs", duration: "0:20", thumbnailHue: 260, origin: "autopilot", published: true }, createdAt: Date.now() - 1000 * 60 * 60 * 12 },
      { id: "ap2", role: "ai", reel: { id: "rap2", title: "Tech Daily — Chip wars", duration: "0:18", thumbnailHue: 220, origin: "autopilot", published: false }, createdAt: Date.now() - 1000 * 60 * 60 * 11 },
    ],
  },
  {
    id: "s-ap-2",
    title: "Autopilot · Sport recap",
    createdAt: Date.now() - 1000 * 60 * 60 * 30,
    messages: [
      { id: "ap3", role: "ai", reel: { id: "rap3", title: "Sport Weekly — Top plays", duration: "0:24", thumbnailHue: 50, origin: "autopilot", published: true }, createdAt: Date.now() - 1000 * 60 * 60 * 30 },
    ],
  },
];

export const initialAutopilotJobs: AutopilotJob[] = [
  {
    id: "ap-job-1",
    topic: "Tech",
    scrapingFrequency: "Hourly",
    generationFrequency: "Daily",
    reelsPerCycle: 3,
    active: true,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 4,
  },
  {
    id: "ap-job-2",
    topic: "Sport",
    scrapingFrequency: "Daily",
    generationFrequency: "Weekly",
    reelsPerCycle: 5,
    active: false,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 10,
  },
];

export function generateMockReel(prompt: string): Reel {
  const hues = [195, 220, 280, 320, 30, 150, 260];
  const durations = ["0:08", "0:12", "0:15", "0:18", "0:22", "0:30"];
  const titleSeed = prompt.split(" ").slice(0, 5).join(" ");
  return {
    id: "r" + Math.random().toString(36).slice(2, 9),
    title: titleSeed.length > 4 ? titleSeed.replace(/^./, (c) => c.toUpperCase()) : "Generated Reel",
    duration: durations[r(durations.length)],
    thumbnailHue: hues[r(hues.length)],
    origin: "prompt",
    published: false,
  };
}

export function newSession(): Session {
  const n = Math.floor(Math.random() * 90) + 10;
  return {
    id: "s" + Math.random().toString(36).slice(2, 9),
    title: `Untitled Reel #${n}`,
    createdAt: Date.now(),
    messages: [],
  };
}

// ========== MOCK LOGIN DATA FOR TESTING ==========

/**
 * Mock login credentials for testing the frontend.
 * Use these to test the login flow without hitting the real backend.
 */
export const mockLoginCredentials = [
  { email: "demo@example.com", handle: "demo", password: "password123" },
  { email: "user@mediaops.io", handle: "user_pro", password: "password123" },
  { email: "test@test.com", handle: "testuser", password: "password123" },
];

/**
 * Mock user objects corresponding to the login credentials above.
 * Use these to simulate successful authentication responses.
 */
export const mockUsers: Record<string, User> = {
  demo: {
    id: "user-1",
    name: "Demo User",
    email: "demo@example.com",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=demo",
    plan: "free",
  },
  user_pro: {
    id: "user-2",
    name: "Pro User",
    email: "user@mediaops.io",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=prouser",
    plan: "pro",
  },
  testuser: {
    id: "user-3",
    name: "Test User",
    email: "test@test.com",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=testuser",
    plan: "free",
  },
};

/**
 * Mock function to simulate login.
 * Returns the mock user if credentials match, otherwise returns null.
 */
export function mockLogin(identifier: string, password: string): User | null {
  const credential = mockLoginCredentials.find(
    (c) => (c.email === identifier || c.handle === identifier) && c.password === password
  );
  if (!credential) return null;
  return mockUsers[credential.handle] || null;
}
