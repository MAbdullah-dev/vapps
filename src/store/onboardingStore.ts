import { create } from "zustand";

interface Step1Data {
  companyName?: string;
  registrationId?: string;
  address?: string;
  contactName?: string;
  contactEmail?: string;
  phone?: string;
  website?: string;
  industry?: string;
}

interface Step2Data {
  // fill later
}

interface Step3Data {
  // fill later
}

// Add all steps up to 11
export interface OnboardingData {
  step1: Step1Data;
  step2: Step2Data;
  step3: Step3Data;
  // ...
  // step4
  // step5
  // ...
  // step11
}

interface OnboardingStore {
  data: OnboardingData;
  updateStep: (step: keyof OnboardingData, values: any) => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingStore>((set) => ({
  data: {
    step1: {},
    step2: {},
    step3: {},
    // add empty objects for future steps
  },

  updateStep: (step, values) =>
    set((state) => ({
      data: {
        ...state.data,
        [step]: { ...state.data[step], ...values },
      },
    })),

  reset: () =>
    set({
      data: {
        step1: {},
        step2: {},
        step3: {},
      },
    }),
}));
