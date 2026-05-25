import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TraceFrame } from "../types";

interface SandboxState {
  // 代码
  code: string;
  setCode: (code: string) => void;

  // 执行结果
  frames: TraceFrame[];
  currentStep: number;

  // 播放控制
  isPlaying: boolean;
  speed: number;
  isDark: boolean;

  // 模板
  selectedTemplate: string | null;

  // 对比模式
  compareMode: boolean;
  compareCode: string;
  compareFrames: TraceFrame[];
  compareCurrentStep: number;
  compareIsPlaying: boolean;
  compareTemplate: string | null;

  // Actions
  run: (frames: TraceFrame[]) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  play: () => void;
  pause: () => void;
  reset: () => void;
  setSpeed: (speed: number) => void;
  toggleTheme: () => void;
  setTemplate: (id: string | null) => void;
  toggleCompareMode: () => void;
  setCompareCode: (code: string) => void;
  runCompare: (frames: TraceFrame[]) => void;
  compareNextStep: () => void;
  comparePrevStep: () => void;
  compareGoToStep: (step: number) => void;
  comparePlay: () => void;
  comparePause: () => void;
  compareReset: () => void;
  setCompareTemplate: (id: string | null) => void;

  // 派生
  currentFrame: () => TraceFrame | null;
  totalSteps: () => number;
  compareCurrentFrame: () => TraceFrame | null;
  compareTotalSteps: () => number;
}

export const useSandboxStore = create<SandboxState>()(
  persist(
    (set, get) => ({
      code: "",
      setCode: (code) => set({ code }),

      frames: [],
      currentStep: -1,

      isPlaying: false,
      speed: 1,
      isDark: document.documentElement.classList.contains("dark"),

      selectedTemplate: null,

      compareMode: false,
      compareCode: "",
      compareFrames: [],
      compareCurrentStep: -1,
      compareIsPlaying: false,
      compareTemplate: null,

      run: (frames) =>
        set({
          frames,
          currentStep: frames.length > 0 ? 0 : -1,
          isPlaying: false,
        }),

      nextStep: () =>
        set((state) => {
          const total = state.frames.length;
          if (total === 0) return {};
          const next = Math.min(state.currentStep + 1, total - 1);
          if (next >= total - 1) {
            return { currentStep: next, isPlaying: false };
          }
          return { currentStep: next };
        }),

      prevStep: () =>
        set((state) => {
          if (state.currentStep <= 0) return { currentStep: 0 };
          return { currentStep: state.currentStep - 1 };
        }),

      goToStep: (step) => set({ currentStep: step }),

      play: () =>
        set((state) => {
          const total = state.frames.length;
          if (total === 0) return {};
          if (state.currentStep >= total - 1) {
            return { currentStep: 0, isPlaying: true };
          }
          return { isPlaying: true };
        }),

      pause: () => set({ isPlaying: false }),

      reset: () =>
        set({
          frames: [],
          currentStep: -1,
          isPlaying: false,
        }),

      setSpeed: (speed) => set({ speed }),

      toggleTheme: () =>
        set((state) => {
          const next = !state.isDark;
          if (next) {
            document.documentElement.classList.add("dark");
          } else {
            document.documentElement.classList.remove("dark");
          }
          return { isDark: next };
        }),

      setTemplate: (id) => set({ selectedTemplate: id }),

      toggleCompareMode: () => set((s) => ({ compareMode: !s.compareMode })),

      setCompareCode: (code) => set({ compareCode: code }),

      runCompare: (frames) =>
        set({
          compareFrames: frames,
          compareCurrentStep: frames.length > 0 ? 0 : -1,
          compareIsPlaying: false,
        }),

      compareNextStep: () =>
        set((state) => {
          const total = state.compareFrames.length;
          if (total === 0) return {};
          const next = Math.min(state.compareCurrentStep + 1, total - 1);
          if (next >= total - 1) {
            return { compareCurrentStep: next, compareIsPlaying: false };
          }
          return { compareCurrentStep: next };
        }),

      comparePrevStep: () =>
        set((state) => {
          if (state.compareCurrentStep <= 0) return { compareCurrentStep: 0 };
          return { compareCurrentStep: state.compareCurrentStep - 1 };
        }),

      compareGoToStep: (step) => set({ compareCurrentStep: step }),

      comparePlay: () =>
        set((state) => {
          const total = state.compareFrames.length;
          if (total === 0) return {};
          if (state.compareCurrentStep >= total - 1) {
            return { compareCurrentStep: 0, compareIsPlaying: true };
          }
          return { compareIsPlaying: true };
        }),

      comparePause: () => set({ compareIsPlaying: false }),

      compareReset: () =>
        set({
          compareFrames: [],
          compareCurrentStep: -1,
          compareIsPlaying: false,
        }),

      setCompareTemplate: (id) => set({ compareTemplate: id }),

      currentFrame: () => {
        const state = get();
        if (state.currentStep < 0 || state.currentStep >= state.frames.length) {
          return null;
        }
        return state.frames[state.currentStep];
      },

      totalSteps: () => get().frames.length,

      compareCurrentFrame: () => {
        const state = get();
        if (state.compareCurrentStep < 0 || state.compareCurrentStep >= state.compareFrames.length) {
          return null;
        }
        return state.compareFrames[state.compareCurrentStep];
      },

      compareTotalSteps: () => get().compareFrames.length,
    }),
    {
      name: "struct-viz-sandbox",
      partialize: (state) => ({
        code: state.code,
        selectedTemplate: state.selectedTemplate,
        isDark: state.isDark,
        speed: state.speed,
        compareCode: state.compareCode,
        compareTemplate: state.compareTemplate,
      }),
    },
  ),
);
