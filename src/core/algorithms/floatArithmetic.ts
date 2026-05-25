import type {
  Literal,
  VisualStructure,
  VisualArrayItem,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

// ── FloatArithmeticRuntime ──

export class FloatArithmeticRuntime implements StructureRuntime {
  private arrays: VisualArrayItem[][] = [];
  private labels: string[] = [];
  private lastOp = "";

  private makeItem(id: string, value: number | string, status: VisualArrayItem["status"] = "default"): VisualArrayItem {
    return { id, value, status };
  }

  /** 将数字转为 IEEE 754 单精度二进制表示 */
  private floatToIEEE754(value: number): { sign: string; exponent: string; mantissa: string } {
    const buf = new ArrayBuffer(4);
    const f32 = new Float32Array(buf);
    f32[0] = value;
    const u32 = new Uint32Array(buf);
    const bits = u32[0].toString(2).padStart(32, "0");
    return {
      sign: bits[0],
      exponent: bits.substring(1, 9),
      mantissa: bits.substring(9),
    };
  }

  /** 从 IEEE 754 二进制串转为十进制浮点数 */
  private ieee754ToFloat(sign: string, exponent: string, mantissa: string): number {
    const bin = sign + exponent + mantissa;
    const buf = new ArrayBuffer(4);
    const u32 = new Uint32Array(buf);
    u32[0] = parseInt(bin.padStart(32, "0"), 2);
    const f32 = new Float32Array(buf);
    return f32[0];
  }

  /** 二进制字符串的加法 */
  private binaryAdd(a: string, b: string, bits: number): string {
    let carry = 0;
    const result: string[] = [];
    for (let i = bits - 1; i >= 0; i--) {
      const sum = parseInt(a[i] ?? "0") + parseInt(b[i] ?? "0") + carry;
      result.unshift(String(sum % 2));
      carry = Math.floor(sum / 2);
    }
    // 如果有进位，截取低位
    return result.slice(-bits).join("");
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
      case "add":
        this.doAdd(Number(args[0]), Number(args[1]), recorder, line);
        break;
      default:
        throw new Error(`FloatArithmetic 不支持方法 "${method}"`);
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

  // ── 浮点数加法 ──

  private doAdd(a: number, b: number, recorder: TraceRecorder, line: number): void {
    this.lastOp = `浮点加法 ${a} + ${b}`;
    this.arrays = [];
    this.labels = [];

    const fa = this.floatToIEEE754(a);
    const fb = this.floatToIEEE754(b);

    // 步骤 1：展示操作数
    const signBits = [parseInt(fa.sign), parseInt(fb.sign)];
    const expA = parseInt(fa.exponent, 2);
    const expB = parseInt(fb.exponent, 2);
    const expBias = 127;

    recorder.record({
      type: "CHECK_INVARIANT",
      title: "展示操作数",
      description: `A = ${a} → 符号位 ${fa.sign}, 阶码 ${fa.exponent}(E=${expA - expBias}), 尾数 ${fa.mantissa}; B = ${b} → 符号位 ${fb.sign}, 阶码 ${fb.exponent}(E=${expB - expBias}), 尾数 ${fb.mantissa}`,
      codeLine: line,
      targets: [],
    });

    this.arrays.push(
      this.binToItems("op-a-s", fa.sign).concat(this.binToItems("op-a-e", fa.exponent)).concat(this.binToItems("op-a-m", fa.mantissa)),
      this.binToItems("op-b-s", fb.sign).concat(this.binToItems("op-b-e", fb.exponent)).concat(this.binToItems("op-b-m", fb.mantissa)),
    );
    this.labels.push(`A: ${a} (S E M)`, `B: ${b} (S E M)`);

    // 步骤 2：对阶
    const expDiff = expA - expB;
    let bigExp: number, bigMant: string, smallMant: string;
    let bigSign: string, smallSign: string;

    if (expDiff >= 0) {
      bigExp = expA;
      bigMant = "1" + fa.mantissa; // 隐含的 1
      smallMant = "1" + fb.mantissa;
      bigSign = fa.sign;
      smallSign = fb.sign;
    } else {
      bigExp = expB;
      bigMant = "1" + fb.mantissa;
      smallMant = "1" + fa.mantissa;
      bigSign = fb.sign;
      smallSign = fa.sign;
    }

    // 右移小阶码的尾数
    const shift = Math.abs(expDiff);
    const alignedSmallMant = shift > 0
      ? "0".repeat(shift) + smallMant.slice(0, smallMant.length - shift)
      : smallMant;

    recorder.record({
      type: "COMPARE",
      title: `对阶: 阶码差 = ${expDiff}`,
      description: `将小阶码操作数尾数右移 ${shift} 位，使阶码对齐到 E=${bigExp - expBias}。大阶尾数: ${bigMant}, 对齐后小阶尾数: ${alignedSmallMant}`,
      codeLine: line,
      targets: [],
    });

    this.arrays.push(
      this.binToItems("align-big", bigMant.padEnd(24, "0").slice(0, 24)),
      this.binToItems("align-small", alignedSmallMant.padEnd(24, "0").slice(0, 24)),
    );
    this.labels.push(`对齐后大阶尾数 (E=${bigExp - expBias})`, `对齐后小阶尾数 (右移${shift}位)`);

    // 步骤 3：尾数相加
    const maxLen = Math.max(bigMant.length, alignedSmallMant.length);
    const paddedBig = bigMant.padEnd(maxLen, "0");
    const paddedSmall = alignedSmallMant.padEnd(maxLen, "0");
    const sumMant = this.binaryAdd(paddedBig, paddedSmall, maxLen);

    recorder.record({
      type: "FILL_CELL",
      title: "尾数相加",
      description: `${paddedBig} + ${paddedSmall} = ${sumMant}。符号位: ${bigSign === smallSign ? "相同" : "不同"}`,
      codeLine: line,
      targets: [],
    });

    this.arrays.push(
      this.binToItems("sum", sumMant.padEnd(24, "0").slice(0, 24)),
    );
    this.labels.push(`尾数之和`);

    // 步骤 4：规格化
    let normalizedMant = sumMant;
    let normalizedExp = bigExp;
    let normShift = 0;

    // 检查是否需要左规或右规
    if (sumMant[0] === "1" && sumMant.length > 24) {
      // 右规
      normalizedMant = sumMant.slice(0, sumMant.length - 1);
      normalizedExp += 1;
      normShift = -1;
    } else {
      // 左规：找到第一个 1
      const firstOne = normalizedMant.indexOf("1");
      if (firstOne > 0) {
        normalizedMant = normalizedMant.slice(firstOne) + "0".repeat(firstOne);
        normalizedExp -= firstOne;
        normShift = firstOne;
      }
    }

    // 截取尾数部分（去掉隐含的 1）
    const finalMantissa = normalizedMant.length > 1
      ? normalizedMant.slice(1, 24).padEnd(23, "0")
      : "0".repeat(23);
    const finalExponent = Math.max(0, Math.min(255, normalizedExp)).toString(2).padStart(8, "0");
    const resultSign = bigSign;
    const result = this.ieee754ToFloat(resultSign, finalExponent, finalMantissa.slice(0, 23));

    recorder.record({
      type: "FILL_CELL",
      title: `规格化${normShift > 0 ? `（左移${normShift}位）` : normShift < 0 ? `（右移1位）` : "（无需移动）"}`,
      description: `规格化尾数: ${normalizedMant.slice(0, 24)}，阶码: E=${normalizedExp - expBias}。结果符号: ${resultSign}`,
      codeLine: line,
      targets: [],
    });

    this.arrays.push(
      this.binToItems("res-s", resultSign).concat(this.binToItems("res-e", finalExponent)).concat(this.binToItems("res-m", finalMantissa.slice(0, 23))),
    );
    this.labels.push(`结果: ${result} (S E M)`);

    // 步骤 5：最终结果
    recorder.record({
      type: "CHECK_INVARIANT",
      title: "浮点加法完成",
      description: `${a} + ${b} = ${result}。IEEE 754: ${resultSign} ${finalExponent} ${finalMantissa.slice(0, 23)}`,
      codeLine: line,
      targets: [],
      payload: { a, b, result },
    });
  }
}
