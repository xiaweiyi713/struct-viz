import { useState, useRef, useCallback, useEffect } from "react";

interface Panel {
  key: string;
  minWidth: number;
  defaultPercent: number;
}

interface ResizableLayoutProps {
  panels: Panel[];
  children: React.ReactNode[];
  storageKey?: string;
}

export default function ResizableLayout({ panels, children, storageKey }: ResizableLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragIndexRef = useRef<number | null>(null);

  const loadSizes = (): number[] => {
    if (!storageKey) return panels.map((p) => p.defaultPercent);
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as number[];
        if (parsed.length === panels.length) return parsed;
      }
    } catch {}
    return panels.map((p) => p.defaultPercent);
  };

  const [sizes, setSizes] = useState<number[]>(loadSizes);

  const saveSizes = useCallback((newSizes: number[]) => {
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(newSizes));
    }
  }, [storageKey]);

  const handleMouseDown = useCallback((index: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    dragIndexRef.current = index;
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragIndexRef.current === null || !containerRef.current) return;
      const container = containerRef.current;
      const containerWidth = container.offsetWidth;
      const index = dragIndexRef.current;

      const x = e.clientX - container.getBoundingClientRect().left;
      const leftPercent = (x / containerWidth) * 100;

      setSizes((prev) => {
        const totalLeft = prev.slice(0, index).reduce((a, b) => a + b, 0);
        const newLeft = Math.max(panels[index].minWidth / containerWidth * 100, Math.min(leftPercent - totalLeft, 100 - totalLeft - panels[index + 1].minWidth / containerWidth * 100));
        const diff = newLeft - prev[index];
        const next = [...prev];
        next[index] = newLeft;
        next[index + 1] = prev[index + 1] - diff;
        saveSizes(next);
        return next;
      });
    };

    const handleMouseUp = () => {
      dragIndexRef.current = null;
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [panels, saveSizes]);

  return (
    <div ref={containerRef} className="flex flex-1 min-h-0 w-full">
      {panels.map((panel, i) => (
        <div key={panel.key} className="flex h-full" style={{ width: `${sizes[i]}%` }}>
          <div className="flex-1 min-w-0 overflow-hidden">
            {children[i]}
          </div>
          {i < panels.length - 1 && (
            <div
              className="w-1 cursor-col-resize hover:bg-indigo-500/30 active:bg-indigo-500/50 transition-colors flex-shrink-0"
              onMouseDown={handleMouseDown(i)}
            />
          )}
        </div>
      ))}
    </div>
  );
}
