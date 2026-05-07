export type View = "explore" | "create" | "library" | "autopilot";

export type ReelOrigin = "prompt" | "autopilot";

export type AutopilotTopic = "Sport" | "News" | "Tech" | "Fashion" | "Food";
export type ScrapingFrequency = "Hourly" | "Daily" | "Weekly";
export type GenerationFrequency = "Daily" | "Weekly" | "Monthly";

export type AutopilotJob = {
  id: string;
  topic: AutopilotTopic;
  scrapingFrequency: ScrapingFrequency;
  generationFrequency: GenerationFrequency;
  reelsPerCycle: number;
  active: boolean;
  createdAt: number;
};

// Frequency rank — lower index = faster
export const SCRAPING_RANK: Record<ScrapingFrequency, number> = { Hourly: 0, Daily: 1, Weekly: 2 };
export const GENERATION_RANK: Record<GenerationFrequency, number> = { Daily: 1, Weekly: 2, Monthly: 3 };

