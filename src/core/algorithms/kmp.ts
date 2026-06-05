import type {
  Literal,
  VisualStructure,
  VisualStringChar,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

export class KMPRuntime implements StructureRuntime {
  private text = "";
  private pattern = "";
  private textChars: VisualStringChar[] = [];
  private patternChars: VisualStringChar[] = [];
  private nextArray: number[] = [];
  private textIndex = 0;
  private patternIndex = 0;

  executeMethod(
    method: string,
    args: Literal[],
    recorder: TraceRecorder,
    line: number,
  ): void {
    if (method !== "match") throw new Error(`KMP 不支持方法 "${method}"`);
    this.doMatch(String(args[0]), String(args[1]), recorder, line);
  }

  getSnapshot(): VisualStructure {
    return {
      type: "string",
      textChars: [...this.textChars],
      patternChars: [...this.patternChars],
      nextArray: [...this.nextArray],
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

    // 初始化字符数组
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
      title: "KMP 算法初始化",
      description: `主串: "${text}"（长度 ${text.length}），模式串: "${pattern}"（长度 ${pattern.length}）`,
      codeLine: line,
      pseudoLine: 1,
      targets: [],
    });

    // ── 步骤 1: 计算 next 数组 ──

    this.nextArray = this.computeNext(pattern, recorder, line);

    recorder.record({
      type: "VISIT_NODE",
      title: "next 数组计算完成",
      description: `next = [${this.nextArray.join(", ")}]`,
      codeLine: line,
      pseudoLine: 2,
      targets: this.patternChars.map((c) => c.id),
    });

    // ── 步骤 2: 匹配过程 ──

    let i = 0;
    let j = 0;

    while (i < text.length) {
      this.textIndex = i;
      this.patternIndex = j;
      this.resetChars();

      // 高亮当前指针
      if (i < this.textChars.length) this.textChars[i].status = "active";
      if (j < this.patternChars.length) this.patternChars[j].status = "active";

      if (text[i] === pattern[j]) {
        // 匹配成功
        this.textChars[i].status = "matched";
        this.patternChars[j].status = "matched";

        recorder.record({
          type: "COMPARE",
          title: `匹配 text[${i}] = '${text[i]}' == pattern[${j}] = '${pattern[j]}'`,
          description: `字符匹配成功！i++, j++`,
          codeLine: line,
          pseudoLine: 7,
          targets: [`t-${i}`, `p-${j}`],
        });

        i++;
        j++;

        // 完全匹配
        if (j === pattern.length) {
          this.textIndex = i;
          this.patternIndex = j;
          this.resetChars();

          const matchStart = i - pattern.length;
          for (let k = 0; k < pattern.length; k++) {
            this.textChars[matchStart + k].status = "highlighted";
            this.patternChars[k].status = "highlighted";
          }

          recorder.record({
            type: "MARK_FINAL",
            title: `匹配成功！在位置 ${matchStart} 处找到模式串`,
            description: `模式串 "${pattern}" 在主串 "${text}" 中首次出现在位置 ${matchStart}`,
            codeLine: line,
            pseudoLine: 10,
            targets: this.textChars.slice(matchStart, matchStart + pattern.length).map((c) => c.id),
            payload: { matchStart },
          });
          return;
        }
      } else {
        // 失配
        this.textChars[i].status = "mismatched";
        this.patternChars[j].status = "mismatched";

        recorder.record({
          type: "COMPARE",
          title: `失配 text[${i}] = '${text[i]}' != pattern[${j}] = '${pattern[j]}'`,
          description: `字符不匹配`,
          codeLine: line,
          pseudoLine: 5,
          targets: [`t-${i}`, `p-${j}`],
        });

        if (this.nextArray[j] === -1) {
          // next[j] == -1，i++, j = 0
          recorder.record({
            type: "VISIT_NODE",
            title: `next[${j}] = -1，i 后移，j 回到 0`,
            description: `j 回退到 0 无意义，主串指针 i 后移一位`,
            codeLine: line,
            pseudoLine: 4,
            targets: [`t-${i}`],
          });
          i++;
          j = 0;
        } else {
          const oldJ = j;
          j = this.nextArray[j];

          recorder.record({
            type: "VISIT_NODE",
            title: `j 回退: ${oldJ} -> ${j}（next[${oldJ}] = ${j}）`,
            description: `模式串右滑，j 回退到 next[${oldJ}] = ${j}，i 不变`,
            codeLine: line,
            pseudoLine: 6,
            targets: [`p-${j}`],
          });
        }
      }
    }

    // 未找到
    this.textIndex = i;
    this.patternIndex = j;
    this.resetChars();

    recorder.record({
      type: "VISIT_NODE",
      title: "匹配失败",
      description: `主串已遍历完毕，未找到模式串 "${pattern}"`,
      codeLine: line,
      pseudoLine: 4,
      targets: [],
      payload: { found: false },
    });
  }

  private computeNext(pattern: string, recorder: TraceRecorder, line: number): number[] {
    const n = pattern.length;
    const next: number[] = new Array(n).fill(0);
    next[0] = -1;

    if (n <= 1) return next;

    let i = 0;
    let j = -1;

    while (i < n - 1) {
      if (j === -1 || pattern[i] === pattern[j]) {
        i++;
        j++;
        next[i] = j;

        this.resetChars();
        if (i < this.patternChars.length) this.patternChars[i].status = "active";
        if (j >= 0 && j < this.patternChars.length) this.patternChars[j].status = "matched";

        recorder.record({
          type: "COMPARE",
          title: `计算 next[${i}] = ${j}`,
          description: `pattern[${i - 1}] = '${pattern[i - 1]}' ${j > 0 ? `== pattern[${j - 1}] = '${pattern[j - 1]}'` : ""}，next[${i}] = ${j}`,
          codeLine: line,
          pseudoLine: 21,
          targets: [`p-${i}`],
        });
      } else {
        recorder.record({
          type: "COMPARE",
          title: `计算 next: pattern[${i}] != pattern[${j}]，j 回退到 next[${j}] = ${next[j]}`,
          description: `失配，j 回退`,
          codeLine: line,
          pseudoLine: 18,
          targets: [`p-${i}`, `p-${j}`],
        });
        j = next[j];
      }
    }

    return next;
  }
}
