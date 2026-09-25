import { useRef, useCallback, useEffect } from "react";
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

/** 单次执行的最长等待时间（毫秒），超时后按执行失败返回 */
const EXECUTE_TIMEOUT_MS = 30000;

export function useExecutorWorker() {
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  // 未完成的请求：requestId -> { resolve, timer }
  const pendingRef = useRef(
    new Map<number, { resolve: (r: WorkerResult) => void; timer: number }>(),
  );

  const settlePending = useCallback((requestId: number, result: WorkerResult) => {
    const pending = pendingRef.current.get(requestId);
    if (!pending) return;
    pendingRef.current.delete(requestId);
    window.clearTimeout(pending.timer);
    pending.resolve(result);
  }, []);

  const getWorker = useCallback(() => {
    if (!workerRef.current) {
      const worker = new Worker(
        new URL("./executorWorker.ts", import.meta.url),
        { type: "module" },
      );
      // worker 内部抛错（如模块加载失败）时，未完成的请求不能永久悬挂
      worker.onerror = () => {
        for (const [requestId] of pendingRef.current) {
          settlePending(requestId, {
            errors: ["执行器发生内部错误，请重试"],
          });
        }
      };
      workerRef.current = worker;
    }
    return workerRef.current;
  }, [settlePending]);

  const execute = useCallback(
    (code: string): Promise<WorkerResult> =>
      new Promise((resolve) => {
        const worker = getWorker();
        requestIdRef.current += 1;
        const requestId = requestIdRef.current;

        const timer = window.setTimeout(() => {
          settlePending(requestId, {
            errors: ["执行超时（30 秒），请减小输入规模后重试"],
          });
        }, EXECUTE_TIMEOUT_MS);
        pendingRef.current.set(requestId, { resolve, timer });

        const handler = (e: MessageEvent) => {
          const data = e.data;
          // 只处理与本次请求匹配的回包，避免并发 execute 错配
          if (data.requestId !== requestId) return;
          worker.removeEventListener("message", handler);
          if (data.type === "success") {
            settlePending(requestId, { frames: data.frames });
          } else if (data.type === "parse-error") {
            settlePending(requestId, {
              errors: data.errors,
              parseErrors: data.parseErrors,
            });
          } else if (data.type === "exec-error") {
            settlePending(requestId, { errors: data.errors });
          }
        };

        worker.addEventListener("message", handler);
        worker.postMessage({ code, requestId });
      }),
    [getWorker, settlePending],
  );

  const terminate = useCallback(() => {
    // terminate 前先让未完成的请求以取消错误返回，避免永久悬挂
    for (const [requestId] of pendingRef.current) {
      settlePending(requestId, { errors: ["执行已被取消"] });
    }
    workerRef.current?.terminate();
    workerRef.current = null;
  }, [settlePending]);

  // 组件卸载时自动清理 worker
  useEffect(() => {
    const pending = pendingRef.current;
    return () => {
      for (const [requestId] of pending) {
        settlePending(requestId, { errors: ["执行已被取消"] });
      }
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, [settlePending]);

  return { execute, terminate };
}
