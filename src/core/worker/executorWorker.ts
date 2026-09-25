import { parse } from "../parser/parser";
import { createRuntime } from "../executor";

interface ExecuteRequest {
  code: string;
  requestId: number;
}

function respond(requestId: number, payload: Record<string, unknown>): void {
  self.postMessage({ requestId, ...payload });
}

self.onmessage = (e: MessageEvent<ExecuteRequest>) => {
  const { code, requestId } = e.data;

  let program;
  try {
    const result = parse(code);
    if (result.errors.length > 0) {
      respond(requestId, {
        type: "parse-error",
        errors: result.errors.map((err) => `第 ${err.line} 行: ${err.message}`),
        parseErrors: result.errors,
      });
      return;
    }

    if (!result.program) {
      respond(requestId, {
        type: "parse-error",
        errors: ["代码为空，请输入有效的 StructScript 代码"],
        parseErrors: [],
      });
      return;
    }
    program = result.program;
  } catch (err) {
    // parse 同步抛错也必须回包，否则调用方的 promise 永久悬挂
    respond(requestId, {
      type: "parse-error",
      errors: [`解析失败 — ${err instanceof Error ? err.message : String(err)}`],
      parseErrors: [],
    });
    return;
  }

  try {
    const runtime = createRuntime();
    const execResult = runtime.execute(program);

    if (execResult.errors.length > 0) {
      respond(requestId, { type: "exec-error", errors: execResult.errors });
      return;
    }

    respond(requestId, { type: "success", frames: execResult.frames });
  } catch (err) {
    respond(requestId, {
      type: "exec-error",
      errors: [err instanceof Error ? err.message : String(err)],
    });
  }
};
