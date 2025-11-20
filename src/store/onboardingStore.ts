import { create } from "zustand";

interface OnboardingData {
  step1: { orgName?: string };
  step2: { website?: string };
  step3: { industry?: string };
  // add more for all steps...
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
  },

  updateStep: (step, values) =>
    set((state) => ({
      data: { ...state.data, [step]: { ...state.data[step], ...values } },
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
