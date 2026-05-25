import { parse } from "../parser/parser";
import { createRuntime } from "../executor";

self.onmessage = (e: MessageEvent<{ code: string }>) => {
  const { code } = e.data;

  const result = parse(code);
  if (result.errors.length > 0) {
    self.postMessage({
      type: "parse-error",
      errors: result.errors.map((err) => `第 ${err.line} 行: ${err.message}`),
      parseErrors: result.errors,
    });
    return;
  }

  if (!result.program) {
    self.postMessage({
      type: "parse-error",
      errors: ["代码为空，请输入有效的 StructScript 代码"],
      parseErrors: [],
    });
    return;
  }

  try {
    const runtime = createRuntime();
    const execResult = runtime.execute(result.program);

    if (execResult.errors.length > 0) {
      self.postMessage({ type: "exec-error", errors: execResult.errors });
      return;
    }

    self.postMessage({ type: "success", frames: execResult.frames });
  } catch (err) {
    self.postMessage({
      type: "exec-error",
      errors: [err instanceof Error ? err.message : String(err)],
    });
  }
};
