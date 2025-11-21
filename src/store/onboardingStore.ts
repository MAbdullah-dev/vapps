import { create } from "zustand";

export interface Step1Data {
  companyName?: string;
  registrationId?: string;
  address?: string;
  contactName?: string;
  contactEmail?: string;
  phone?: string;
  website?: string;
  industry?: string;
}

export interface Step2Site {
  siteName: string;
  siteCode: string;
  location: string;
}

export interface Step2Data {
  sites: Step2Site[];
}

export interface Step3Data {
  leaders: LeaderData[]; // Updated to include leaders
}

export interface LeaderData {
  name: string;
  role: string;
  level: string;
  email?: string;
}

export interface OnboardingData {
  step1: Step1Data;
  step2: Step2Data;
  step3: Step3Data;
}

interface OnboardingStore {
  data: OnboardingData;
  updateStep: (step: keyof OnboardingData, values: any) => void;
  addSiteToStep2: (site: Step2Site) => void;
  reset: () => void;
}

export const useSiteStore = create<OnboardingStore>((set) => ({
  data: {
    step1: {},
    step2: { sites: [] },
    step3: { leaders: [] }, // Make sure leaders is an empty array by default
  },

  updateStep: (step, values) =>
    set((state) => ({
      data: {
        ...state.data,
        [step]: { ...state.data[step], ...values },
      },
    })),

  addSiteToStep2: (site) =>
    set((state) => ({
      data: {
        ...state.data,
        step2: {
          sites: [...state.data.step2.sites, site],
        },
      },
    })),

  reset: () =>
    set({
      data: {
        step1: {},
        step2: { sites: [] },
        step3: { leaders: [] }, // Reset leaders on reset
      },
    }),
}));
