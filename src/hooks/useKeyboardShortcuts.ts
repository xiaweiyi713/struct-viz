import { useEffect } from "react";

interface ShortcutActions {
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onReset: () => void;
  onSetSpeed: (speed: number) => void;
  onRun?: () => void;
}

const speedMap: Record<string, number> = {
  "1": 0.25,
  "2": 0.5,
  "3": 1,
  "4": 2,
  "5": 4,
};

export function useKeyboardShortcuts({
  onTogglePlay,
  onNext,
  onPrev,
  onReset,
  onSetSpeed,
  onRun,
}: ShortcutActions) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ctrl/Cmd + Enter: 运行代码（全局生效，包括编辑器内）
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        onRun?.();
        return;
      }

      const active = document.activeElement;
      if (
        active?.closest(".monaco-editor") ||
        active?.tagName === "INPUT" ||
        active?.tagName === "TEXTAREA"
      ) {
        return;
      }

      switch (e.key) {
        case " ":
          e.preventDefault();
          onTogglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          onPrev();
          break;
        case "ArrowRight":
          e.preventDefault();
          onNext();
          break;
        case "r":
        case "R":
          e.preventDefault();
          onReset();
          break;
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
          e.preventDefault();
          onSetSpeed(speedMap[e.key]);
          break;
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onTogglePlay, onNext, onPrev, onReset, onSetSpeed, onRun]);
}
