import type {
  Literal,
  VisualStructure,
  VisualArrayItem,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

// ── SignMagnitudeMulRuntime ──

export class SignMagnitudeMulRuntime implements StructureRuntime {
  private arrays: VisualArrayItem[][] = [];
  private labels: string[] = [];
  private lastOp = "";

  private makeItem(id: string, value: number | string, status: VisualArrayItem["status"] = "default"): VisualArrayItem {
    return { id, value, status };
  }

  /** 将正整数转为指定位数的二进制字符串 */
  private toBinary(value: number, bits: number): string {
    const v = ((value % (1 << bits)) + (1 << bits)) % (1 << bits);
    return v.toString(2).padStart(bits, "0");
  }

  /** 二进制字符串加法 */
  private binaryAdd(a: string, b: string): string {
    const bits = a.length;
    let carry = 0;
    const result: string[] = [];
    for (let i = bits - 1; i >= 0; i--) {
      const sum = parseInt(a[i]) + parseInt(b[i]) + carry;
      result.unshift(String(sum % 2));
      carry = Math.floor(sum / 2);
    }
    // 截取指定位
    return result.slice(-bits).join("");
  }

  /** 二进制字符串逻辑右移 */
  private logicalRightShift(a: string): string {
    return "0" + a.substring(0, a.length - 1);
  }

  private binToItems(prefix: string, bin: string): VisualArrayItem[] {
    return bin.split("").map((bit, i) =>
      this.makeItem(`${prefix}-${i}`, parseInt(bit))
    );
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
        throw new Error(`SignMagnitudeMul 不支持方法 "${method}"`);
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

  // ── 原码一位乘法 ──

  private doMultiply(a: number, b: number, bits: number, recorder: TraceRecorder, line: number): void {
    this.lastOp = `原码乘法 ${a} × ${b}（${bits}位）`;
    this.arrays = [];
    this.labels = [];

    // 分离符号和绝对值
    const signA = a < 0 ? 1 : 0;
    const signB = b < 0 ? 1 : 0;
    const absA = Math.abs(a);
    const absB = Math.abs(b);

    const resultSign = signA ^ signB; // 异或确定符号

    recorder.record({
      type: "CHECK_INVARIANT",
      title: "原码一位乘法初始化",
      description: `被乘数 X = ${a}（符号${signA}，绝对值${absA}），乘数 Y = ${b}（符号${signB}，绝对值${absB}）。结果符号 = ${signA} ⊕ ${signB} = ${resultSign}`,
      codeLine: line,
    });

    const binX = this.toBinary(absA, bits);
    const binY = this.toBinary(absB, bits);

    // 初始化部分积为 0（bits 位）
    let partialProduct = "0".repeat(bits);
    let multiplier = binY;

    // 展示初始状态
    this.arrays.push(
      this.binToItems("init-pp", partialProduct),
    );
    this.labels.push(`初始部分积 = 0`);
    this.arrays.push(
      this.binToItems("init-y", multiplier),
    );
    this.labels.push(`乘数 Y = ${binY}（${absB}）`);

    // 逐步乘法
    for (let step = 0; step < bits; step++) {
      const yi = multiplier[multiplier.length - 1]; // 乘数最低位

      recorder.record({
        type: "COMPARE",
        title: `步骤 ${step + 1}：检查 Y[${step}] = ${yi}`,
        description: `乘数第 ${step} 位为 ${yi}${yi === "1" ? `，部分积 += X（${binX}）` : "，部分积不变"}`,
        codeLine: line,
      });

      if (yi === "1") {
        // 部分积 + 被乘数
        partialProduct = this.binaryAdd(partialProduct, binX);

        this.arrays.push(
          this.binToItems(`s${step + 1}-pp`, partialProduct),
        );
        this.labels.push(`步骤${step + 1}: PP + X = ${partialProduct}`);
      }

      // 逻辑右移：部分积和乘数一起右移
      const shiftedBit = partialProduct[partialProduct.length - 1];
      partialProduct = this.logicalRightShift(partialProduct);
      multiplier = shiftedBit + multiplier.substring(0, multiplier.length - 1);

      this.arrays.push(
        this.binToItems(`s${step + 1}-pp-s`, partialProduct),
      );
      this.labels.push(`步骤${step + 1}右移: PP = ${partialProduct}`);
      this.arrays.push(
        this.binToItems(`s${step + 1}-y-s`, multiplier),
      );
      this.labels.push(`步骤${step + 1}右移: Y = ${multiplier}`);
    }

    // 最终结果
    const productBits = partialProduct + multiplier;
    const productVal = parseInt(productBits, 2);
    const signedResult = resultSign === 1 ? -productVal : productVal;

    recorder.record({
      type: "CHECK_INVARIANT",
      title: "乘法完成",
      description: `绝对值乘积 = ${productBits}（${productVal}）。符号位 = ${resultSign}。最终结果 = ${signedResult}。验证: ${a} × ${b} = ${a * b}`,
      codeLine: line,
      payload: { product: signedResult, bits: productBits },
    });
  }
}
