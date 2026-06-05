import type {
  Literal,
  VisualStructure,
  VisualStringChar,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

export class NaiveStringMatchingRuntime implements StructureRuntime {
  private text = "";
  private pattern = "";
  private textChars: VisualStringChar[] = [];
  private patternChars: VisualStringChar[] = [];
  private textIndex = 0;
  private patternIndex = 0;

  executeMethod(
    method: string,
    args: Literal[],
    recorder: TraceRecorder,
    line: number,
  ): void {
    if (method !== "match") throw new Error(`NaiveStr 不支持方法 "${method}"`);
    this.doMatch(String(args[0]), String(args[1]), recorder, line);
  }

  getSnapshot(): VisualStructure {
    return {
      type: "string",
      textChars: [...this.textChars],
      patternChars: [...this.patternChars],
      nextArray: [],
      textIndex: this.textIndex,
      patternIndex: this.patternIndex,
    };
  }

  getVariables(): Record<string, RuntimeValue> {
    return {
      text: { type: "string", value: this.text, display: `"${this.text}"` },
      pattern: { type: "string", value: this.pattern, display: `"${this.pattern}"` },
      i: { type: "number", value: this.textIndex, display: `${this.textIndex}` },
      j: { type: "number", value: this.patternIndex, display: `${this.patternIndex}` },
    };
  }

  private resetChars(): void {
    for (const c of this.textChars) c.status = "default";
    for (const c of this.patternChars) c.status = "default";
  }

  private doMatch(text: string, pattern: string, recorder: TraceRecorder, line: number): void {
    this.text = text;
    this.pattern = pattern;

    this.textChars = text.split("").map((char, i) => ({
      id: `t-${i}`,
      char,
      status: "default",
      index: i,
    }));
    this.patternChars = pattern.split("").map((char, i) => ({
      id: `p-${i}`,
      char,
      status: "default",
      index: i,
    }));

    recorder.record({
      type: "VISIT_NODE",
      title: "朴素模式匹配初始化",
      description: `主串: "${text}"（长度 ${text.length}），模式串: "${pattern}"（长度 ${pattern.length}）。从左到右逐字符比较，失配时主串指针回退。`,
      codeLine: line,
      pseudoLine: 1,
      targets: [],
    });

    const n = text.length;
    const m = pattern.length;
    let i = 0;
    let j = 0;

    while (i < n && j < m) {
      this.textIndex = i;
      this.patternIndex = j;
      this.resetChars();
      this.textChars[i].status = "active";
      if (j < m) this.patternChars[j].status = "active";

      if (text[i] === pattern[j]) {
        this.textChars[i].status = "matched";
        this.patternChars[j].status = "matched";

        recorder.record({
          type: "COMPARE",
          title: `匹配 text[${i}] = '${text[i]}' == pattern[${j}] = '${pattern[j]}'`,
          description: `字符匹配成功！i++, j++`,
          codeLine: line,
          pseudoLine: 3,
          targets: [`t-${i}`, `p-${j}`],
        });

        i++;
        j++;

        if (j === m) {
          this.textIndex = i;
          this.patternIndex = j;
          this.resetChars();

          const matchStart = i - m;
          for (let k = 0; k < m; k++) {
            this.textChars[matchStart + k].status = "highlighted";
            this.patternChars[k].status = "highlighted";
          }

          recorder.record({
            type: "MARK_FINAL",
            title: `匹配成功！在位置 ${matchStart} 处找到模式串`,
            description: `模式串 "${pattern}" 在主串 "${text}" 中首次出现在位置 ${matchStart}`,
            codeLine: line,
            pseudoLine: 4,
            targets: this.textChars.slice(matchStart, matchStart + m).map((c) => c.id),
            payload: { matchStart },
          });
          return;
        }
      } else {
        this.textChars[i].status = "mismatched";
        this.patternChars[j].status = "mismatched";

        const backtrack = i - j + 1;

        recorder.record({
          type: "COMPARE",
          title: `失配 text[${i}] = '${text[i]}' != pattern[${j}] = '${pattern[j]}'`,
          description: `字符不匹配。主串指针回退到 ${backtrack}，模式串指针重置为 0`,
          codeLine: line,
          pseudoLine: 3,
          targets: [`t-${i}`, `p-${j}`],
        });

        i = backtrack;
        j = 0;
      }
    }

    this.textIndex = i;
    this.patternIndex = j;
    this.resetChars();

    recorder.record({
      type: "VISIT_NODE",
      title: "匹配失败",
      description: `主串已遍历完毕，未找到模式串 "${pattern}"`,
      codeLine: line,
      pseudoLine: 2,
      targets: [],
      payload: { found: false },
    });
  }
}
