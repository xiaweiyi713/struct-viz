import { useRef, useCallback } from "react";
import type { TraceFrame } from "../../types";

interface ParseError {
  line: number;
  column: number;
  message: string;
}

interface WorkerResult {
  frames?: TraceFrame[];
  errors?: string[];
  parseErrors?: ParseError[];
}

export function useExecutorWorker() {
  const workerRef = useRef<Worker | null>(null);

  const getWorker = useCallback(() => {
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL("./executorWorker.ts", import.meta.url),
        { type: "module" },
      );
    }
    return workerRef.current;
  }, []);

  const execute = useCallback(
    (code: string): Promise<WorkerResult> =>
      new Promise((resolve) => {
        const worker = getWorker();

        const handler = (e: MessageEvent) => {
          worker.removeEventListener("message", handler);
          const data = e.data;
          if (data.type === "success") {
            resolve({ frames: data.frames });
          } else if (data.type === "parse-error") {
            resolve({ errors: data.errors, parseErrors: data.parseErrors });
          } else if (data.type === "exec-error") {
            resolve({ errors: data.errors });
          }
        };

        worker.addEventListener("message", handler);
        worker.postMessage({ code });
      }),
    [getWorker],
  );

  const terminate = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
  }, []);

  return { execute, terminate };
}
