export type CurrencyWallet = {
  gold: number;
  diamonds: number;
};

export type RpgState = {
  wallet: CurrencyWallet;
  practices: unknown[];
  practiceLogs: unknown[];
  creativeLines: unknown[];
  creativeLogs: unknown[];
  projects: unknown[];
  states: unknown[];
  bosses: unknown[];
  campaigns: unknown[];
  rewards: unknown[];
  achievements: unknown[];
  [key: string]: unknown;
};

export const STATE_KEY = 'rpg-life-v4';
