import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WorkingHours {
  monday: { enabled: boolean; start: string; end: string };
  tuesday: { enabled: boolean; start: string; end: string };
  wednesday: { enabled: boolean; start: string; end: string };
  thursday: { enabled: boolean; start: string; end: string };
  friday: { enabled: boolean; start: string; end: string };
  saturday: { enabled: boolean; start: string; end: string };
  sunday: { enabled: boolean; start: string; end: string };
}

export interface LunchWindow {
  enabled: boolean;
  start: string;
  end: string;
}

interface OnboardingState {
  currentStep: number;
  isCompleted: boolean;
  workingHours: WorkingHours;
  lunchWindow: LunchWindow;
  timezone: string;
  
  // Actions
  setCurrentStep: (step: number) => void;
  setIsCompleted: (completed: boolean) => void;
  setWorkingHours: (hours: WorkingHours) => void;
  setLunchWindow: (lunch: LunchWindow) => void;
  setTimezone: (timezone: string) => void;
  resetOnboarding: () => void;
}

const defaultWorkingHours: WorkingHours = {
  monday: { enabled: true, start: '09:00', end: '17:00' },
  tuesday: { enabled: true, start: '09:00', end: '17:00' },
  wednesday: { enabled: true, start: '09:00', end: '17:00' },
  thursday: { enabled: true, start: '09:00', end: '17:00' },
  friday: { enabled: true, start: '09:00', end: '17:00' },
  saturday: { enabled: false, start: '09:00', end: '17:00' },
  sunday: { enabled: false, start: '09:00', end: '17:00' },
};

const defaultLunchWindow: LunchWindow = {
  enabled: true,
  start: '12:00',
  end: '13:00',
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      currentStep: 1,
      isCompleted: false,
      workingHours: defaultWorkingHours,
      lunchWindow: defaultLunchWindow,
      timezone: 'America/Los_Angeles',
      
      setCurrentStep: (step) => set({ currentStep: step }),
      setIsCompleted: (completed) => set({ isCompleted: completed }),
      setWorkingHours: (hours) => set({ workingHours: hours }),
      setLunchWindow: (lunch) => set({ lunchWindow: lunch }),
      setTimezone: (timezone) => set({ timezone }),
      resetOnboarding: () => set({
        currentStep: 1,
        isCompleted: false,
        workingHours: defaultWorkingHours,
        lunchWindow: defaultLunchWindow,
        timezone: 'America/Los_Angeles',
      }),
    }),
    {
      name: 'onboarding-storage',
      partialize: (state) => ({
        isCompleted: state.isCompleted,
        workingHours: state.workingHours,
        lunchWindow: state.lunchWindow,
        timezone: state.timezone,
      }),
    }
  )
);