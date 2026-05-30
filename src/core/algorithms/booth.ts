import type {
  Literal,
  VisualStructure,
  VisualArrayItem,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

// ── BoothMultiplyRuntime ──

export class BoothMultiplyRuntime implements StructureRuntime {
  private arrays: VisualArrayItem[][] = [];
  private labels: string[] = [];
  private lastOp = "";

  private makeItem(id: string, value: number | string, status: VisualArrayItem["status"] = "default"): VisualArrayItem {
    return { id, value, status };
  }

  /** 将整数转为指定位数的二进制补码字符串 */
  private toTwosComplement(value: number, bits: number): string {
    const twosComp = ((value % (1 << bits)) + (1 << bits)) % (1 << bits);
    return twosComp.toString(2).padStart(bits, "0");
  }

  /** 从补码二进制串还原为十进制（有符号） */
  private fromTwosComplement(bin: string): number {
    const bits = bin.length;
    const val = parseInt(bin, 2);
    if (bin[0] === "1") {
      return val - (1 << bits);
    }
    return val;
  }

  /** 二进制加法（补码） */
  private binaryAdd(a: string, b: string): string {
    const bits = a.length;
    let carry = 0;
    const result: string[] = [];
    for (let i = bits - 1; i >= 0; i--) {
      const sum = parseInt(a[i]) + parseInt(b[i]) + carry;
      result.unshift(String(sum % 2));
      carry = Math.floor(sum / 2);
    }
    return result.join("");
  }

  /** 算术右移 */
  private arithmeticRightShift(a: string, q: string): { newA: string; newQ: string; lastQ0: string } {
    const signBit = a[0];
    const lastQ0 = q[q.length - 1];
    const newQ = a[a.length - 1] + q.substring(0, q.length - 1);
    const newA = signBit + a.substring(0, a.length - 1);
    return { newA, newQ, lastQ0 };
  }

  /** 将寄存器组合 (A + Q + Q(-1)) 拆分为单个 item 数组 */
  private regToItems(prefix: string, a: string, q: string, qneg1: string): VisualArrayItem[] {
    const items: VisualArrayItem[] = [];
    for (let i = 0; i < a.length; i++) {
      items.push(this.makeItem(`${prefix}-a-${i}`, parseInt(a[i]), "default"));
    }
    for (let i = 0; i < q.length; i++) {
      items.push(this.makeItem(`${prefix}-q-${i}`, parseInt(q[i]), "default"));
    }
    items.push(this.makeItem(`${prefix}-qn`, parseInt(qneg1), "default"));
    return items;
  }

  executeMethod(
    method: string,
    args: Literal[],
    recorder: TraceRecorder,
    line: number,
  ): void {
    switch (method) {
      case "multiply":
        this.doMultiply(Number(args[0]), Number(args[1]), Number(args[2] ?? 4), recorder, line);
        break;
      default:
        throw new Error(`BoothMultiply 不支持方法 "${method}"`);
    }
  }

  getSnapshot(): VisualStructure {
    return {
      type: "multiarray",
      arrays: this.arrays,
      labels: this.labels,
    };
  }

  getVariables(): Record<string, RuntimeValue> {
    return {
      operation: { type: "string", value: this.lastOp, display: this.lastOp || "无" },
    };
  }

  // ── Booth 乘法 ──

  private doMultiply(a: number, b: number, bits: number, recorder: TraceRecorder, line: number): void {
    this.lastOp = `Booth乘法 ${a}×${b}`;

    const binA = this.toTwosComplement(a, bits);
    const binB = this.toTwosComplement(b, bits);
    const negBinA = this.toTwosComplement(-a, bits);

    // 初始状态：A = 0, Q = 被乘数(b), Q(-1) = 0
    let regA = "0".repeat(bits);
    let regQ = binB;
    let qneg1 = "0";

    this.arrays = [];
    this.labels = [];

    // 步骤0：初始化
    const initItems = this.regToItems("step0", regA, regQ, qneg1);
    this.arrays.push(initItems);
    this.labels.push(`初始(A,Q,Q₋₁)`);

    recorder.record({
      type: "CHECK_INVARIANT",
      title: "初始化寄存器",
      description: `A = ${regA}（累加器），Q = ${regQ}（乘数 = ${b}），Q₋₁ = ${qneg1}。被乘数 M = ${binA}（= ${a}），-M = ${negBinA}（= ${-a}）`,
      codeLine: line,
    });

    // Booth 算法主循环
    for (let step = 0; step < bits; step++) {
      const q0 = regQ[regQ.length - 1];
      const pair = q0 + qneg1;
      let action: string;

      if (pair === "01") {
        // A = A + M
        regA = this.binaryAdd(regA, binA);
        action = `Q₀Q₋₁ = ${pair}，A = A + M = ${regA}`;
      } else if (pair === "10") {
        // A = A - M
        regA = this.binaryAdd(regA, negBinA);
        action = `Q₀Q₋₁ = ${pair}，A = A - M = ${regA}`;
      } else {
        action = `Q₀Q₋₁ = ${pair}，无加减操作`;
      }

      // 记录加减操作
      const stepLabel = `步骤${step + 1}前`;
      const preShiftItems = this.regToItems(`s${step + 1}pre`, regA, regQ, qneg1);
      this.arrays.push(preShiftItems);
      this.labels.push(`${stepLabel}(A,Q,Q₋₁)`);

      recorder.record({
        type: "COMPARE",
        title: `步骤 ${step + 1}：检查 Q₀Q₋₁ = ${pair}`,
        description: action,
        codeLine: line,
      });

      // 算术右移
      const { newA, newQ, lastQ0 } = this.arithmeticRightShift(regA, regQ);
      qneg1 = lastQ0;
      regA = newA;
      regQ = newQ;

      const afterShiftItems = this.regToItems(`s${step + 1}post`, regA, regQ, qneg1);
      this.arrays.push(afterShiftItems);
      this.labels.push(`步骤${step + 1}后(A,Q,Q₋₁)`);

      recorder.record({
        type: "FILL_CELL",
        title: `步骤 ${step + 1}：算术右移`,
        description: `右移后 A = ${regA}，Q = ${regQ}，Q₋₁ = ${qneg1}`,
        codeLine: line,
      });
    }

    // 最终结果
    const product = regA + regQ;
    const productVal = this.fromTwosComplement(product);

    recorder.record({
      type: "CHECK_INVARIANT",
      title: "最终结果",
      description: `乘积 = A concat Q = ${product}，十进制: ${productVal}。验证: ${a} × ${b} = ${a * b}`,
      codeLine: line,
    });
  }
}
