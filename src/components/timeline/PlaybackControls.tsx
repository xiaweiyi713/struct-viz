interface PlaybackControlsProps {
  currentStep: number;
  totalSteps: number;
  isPlaying: boolean;
  speed: number;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onReset: () => void;
  onGoToStep: (step: number) => void;
  onSpeedChange: (speed: number) => void;
}

const speeds = [0.25, 0.5, 1, 2, 4];

export default function PlaybackControls({
  currentStep,
  totalSteps,
  isPlaying,
  speed,
  onPlay,
  onPause,
  onNext,
  onPrev,
  onReset,
  onGoToStep,
  onSpeedChange,
}: PlaybackControlsProps) {
  const hasFrames = totalSteps > 0;
  const displayStep = currentStep >= 0 ? currentStep + 1 : 0;

  return (
    <div className="flex items-center gap-4 px-5 py-2.5 shrink-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-1.5">
        <button
          onClick={onReset}
          disabled={!hasFrames}
          className="p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-25 transition-colors"
          title="重置"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
          </svg>
        </button>

        <button
          onClick={onPrev}
          disabled={!hasFrames || currentStep <= 0}
          className="p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-25 transition-colors"
          title="上一步"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/>
          </svg>
        </button>

        <button
          onClick={isPlaying ? onPause : onPlay}
          disabled={!hasFrames}
          className={`flex items-center justify-center w-10 h-10 rounded-full text-white transition-all ${
            hasFrames
              ? "bg-gradient-to-r from-indigo-500 to-violet-500 shadow-md hover:scale-108 hover:shadow-lg"
              : "bg-slate-200 dark:bg-slate-700"
          }`}
          title={isPlaying ? "暂停" : "播放"}
        >
          {isPlaying ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="6 3 20 12 6 21 6 3"/>
            </svg>
          )}
        </button>

        <button
          onClick={onNext}
          disabled={!hasFrames || currentStep >= totalSteps - 1}
          className="p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-25 transition-colors"
          title="下一步"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/>
          </svg>
        </button>
      </div>

      <div className="flex-1 flex items-center">
        <input
          type="range"
          min={0}
          max={Math.max(totalSteps - 1, 0)}
          value={currentStep >= 0 ? currentStep : 0}
          onChange={(e) => onGoToStep(Number(e.target.value))}
          disabled={!hasFrames}
          className="w-full disabled:opacity-25 disabled:cursor-not-allowed"
          style={{
            background: hasFrames
              ? `linear-gradient(to right, #6366f1 ${totalSteps > 1 ? (currentStep / (totalSteps - 1)) * 100 : 100}%, #e2e8f0 ${totalSteps > 1 ? (currentStep / (totalSteps - 1)) * 100 : 100}%)`
              : "#e2e8f0",
          }}
        />
      </div>

      <div className="hidden sm:flex items-center gap-1 rounded-lg p-1 bg-slate-100 dark:bg-slate-800">
        {speeds.map((s) => (
          <button
            key={s}
            onClick={() => onSpeedChange(s)}
            className={`px-2 py-1 rounded-md text-xs font-semibold transition-colors ${
              speed === s
                ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white"
                : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            {s}x
          </button>
        ))}
      </div>

      <div className="text-sm font-mono tabular-nums shrink-0 min-w-[68px] text-right font-medium text-slate-500 dark:text-slate-400">
        {displayStep} / {totalSteps}
      </div>
    </div>
  );
}
