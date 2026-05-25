import type {
  Literal,
  VisualStructure,
  VisualArrayItem,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

// ── IEEE754Runtime ──

export class IEEE754Runtime implements StructureRuntime {
  private arrays: VisualArrayItem[][] = [[], [], []];
  private labels = ["符号位(S)", "指数(E)", "尾数(M)"];
  private lastOp = "";

  private makeItem(id: string, value: number | string, status: VisualArrayItem["status"] = "default"): VisualArrayItem {
    return { id, value, status };
  }

  private binaryToItems(prefix: string, bin: string, status: VisualArrayItem["status"] = "default"): VisualArrayItem[] {
    return bin.split("").map((bit, i) => this.makeItem(`${prefix}-${i}`, parseInt(bit), status));
  }

  executeMethod(
    method: string,
    args: Literal[],
    recorder: TraceRecorder,
    line: number,
  ): void {
    switch (method) {
      case "encode":
        this.doEncode(Number(args[0]), recorder, line);
        break;
      case "decode":
        this.doDecode(String(args[0]), recorder, line);
        break;
      default:
        throw new Error(`IEEE754 不支持方法 "${method}"`);
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

  // ── 编码：十进制 → IEEE 754 ──

  private doEncode(value: number, recorder: TraceRecorder, line: number): void {
    this.lastOp = "编码(encode)";

    // 步骤1：确定符号位
    const sign = value < 0 ? 1 : 0;
    const absValue = Math.abs(value);

    this.arrays[0] = [this.makeItem("s-0", sign, "highlighted")];
    this.arrays[1] = [];
    this.arrays[2] = [];
    recorder.record({
      type: "CHECK_INVARIANT",
      title: "确定符号位",
      description: `值 ${value} ${sign === 0 ? "≥ 0，符号位 S = 0（正数）" : "< 0，符号位 S = 1（负数）"}`,
      codeLine: line,
    });

    // 处理特殊情况
    if (absValue === 0) {
      this.arrays[1] = this.binaryToItems("e", "00000000");
      this.arrays[2] = this.binaryToItems("m", "00000000000000000000000");
      recorder.record({
        type: "FILL_CELL",
        title: "特殊情况：零",
        description: "值为 0，指数全 0，尾数全 0",
        codeLine: line,
      });
      return;
    }

    if (Number.isNaN(value)) {
      this.arrays[1] = this.binaryToItems("e", "11111111");
      this.arrays[2] = this.binaryToItems("m", "10000000000000000000000");
      recorder.record({
        type: "FILL_CELL",
        title: "特殊情况：NaN",
        description: "NaN，指数全 1，尾数非零",
        codeLine: line,
      });
      return;
    }

    if (!Number.isFinite(value)) {
      this.arrays[1] = this.binaryToItems("e", "11111111");
      this.arrays[2] = this.binaryToItems("m", "00000000000000000000000");
      recorder.record({
        type: "FILL_CELL",
        title: "特殊情况：无穷",
        description: "无穷，指数全 1，尾数全 0",
        codeLine: line,
      });
      return;
    }

    // 步骤2：规格化 - 转为 1.xxxx * 2^E 的形式
    let exponent = 0;
    let mantissa = absValue;

    if (mantissa >= 2) {
      while (mantissa >= 2) {
        mantissa /= 2;
        exponent++;
      }
    } else if (mantissa < 1) {
      while (mantissa < 1) {
        mantissa *= 2;
        exponent--;
      }
    }

    this.arrays[1] = this.binaryToItems("e", "00000000", "active");
    this.arrays[2] = this.binaryToItems("m", "00000000000000000000000", "active");
    recorder.record({
      type: "FILL_CELL",
      title: "规格化",
      description: `${absValue} = ${mantissa.toFixed(10)} × 2^${exponent}，即 1.${this.fracToBinary(mantissa - 1, 23)} × 2^${exponent}`,
      codeLine: line,
    });

    // 步骤3：计算指数（加偏移量 127）
    const biasedExponent = exponent + 127;
    const expBin = biasedExponent.toString(2).padStart(8, "0");

    this.arrays[1] = this.binaryToItems("e", expBin).map((item, i) =>
      i === 0 ? { ...item, status: "highlighted" as const } : item
    );
    recorder.record({
      type: "FILL_CELL",
      title: "计算偏移指数",
      description: `E = 真实指数 + 偏移量 = ${exponent} + 127 = ${biasedExponent}，二进制: ${expBin}`,
      codeLine: line,
    });

    // 步骤4：计算尾数（去掉隐含的 1，取小数部分）
    const fracPart = mantissa - 1;
    const mantissaBin = this.fracToBinary(fracPart, 23);

    this.arrays[2] = this.binaryToItems("m", mantissaBin).map((item, i) =>
      i === 0 ? { ...item, status: "highlighted" as const } : item
    );
    recorder.record({
      type: "FILL_CELL",
      title: "计算尾数",
      description: `尾数 = 小数部分（隐含前导1）: ${mantissaBin}，来自 ${fracPart.toFixed(10)}`,
      codeLine: line,
    });

    // 步骤5：组装结果
    this.arrays[0] = [this.makeItem("s-0", sign, "highlighted")];
    this.arrays[1] = this.binaryToItems("e", expBin, "highlighted");
    this.arrays[2] = this.binaryToItems("m", mantissaBin, "highlighted");

    recorder.record({
      type: "FILL_CELL",
      title: "组装 IEEE 754",
      description: `最终结果: S=${sign} E=${expBin}(${biasedExponent}) M=${mantissaBin}。完整32位: ${sign}${expBin}${mantissaBin}`,
      codeLine: line,
    });
  }

  // ── 解码：IEEE 754 → 十进制 ──

  private doDecode(bits: string, recorder: TraceRecorder, line: number): void {
    this.lastOp = "解码(decode)";

    // 清理输入
    bits = bits.replace(/\s/g, "");
    if (bits.length !== 32 || !/^[01]+$/.test(bits)) {
      throw new Error(`decode 需要 32 位二进制字符串，收到 "${bits}"（长度 ${bits.length}）`);
    }

    const signBit = bits[0];
    const expBits = bits.substring(1, 9);
    const mantissaBits = bits.substring(9, 32);

    // 步骤1：提取符号位
    const sign = parseInt(signBit);
    this.arrays[0] = [this.makeItem("s-0", sign, "highlighted")];
    recorder.record({
      type: "CHECK_INVARIANT",
      title: "提取符号位",
      description: `S = ${signBit}，${sign === 0 ? "正数" : "负数"}`,
      codeLine: line,
    });

    // 步骤2：提取指数
    const biasedExp = parseInt(expBits, 2);
    this.arrays[1] = this.binaryToItems("e", expBits, "highlighted");
    recorder.record({
      type: "FILL_CELL",
      title: "提取指数",
      description: `E = ${expBits} = ${biasedExp}（偏移表示）`,
      codeLine: line,
    });

    // 步骤3：提取尾数
    this.arrays[2] = this.binaryToItems("m", mantissaBits, "highlighted");
    recorder.record({
      type: "FILL_CELL",
      title: "提取尾数",
      description: `M = ${mantissaBits}`,
      codeLine: line,
    });

    // 步骤4：计算十进制值
    let result: number;

    if (biasedExp === 0 && parseInt(mantissaBits, 2) === 0) {
      result = 0;
    } else if (biasedExp === 255 && parseInt(mantissaBits, 2) === 0) {
      result = sign === 0 ? Infinity : -Infinity;
    } else if (biasedExp === 255) {
      result = NaN;
    } else if (biasedExp === 0) {
      // 非规格化数
      const mantissaVal = parseInt(mantissaBits, 2) / Math.pow(2, 23);
      result = Math.pow(-1, sign) * mantissaVal * Math.pow(2, -126);
    } else {
      // 规格化数
      const trueExp = biasedExp - 127;
      const mantissaVal = 1 + parseInt(mantissaBits, 2) / Math.pow(2, 23);
      result = Math.pow(-1, sign) * mantissaVal * Math.pow(2, trueExp);
    }

    recorder.record({
      type: "FILL_CELL",
      title: "计算十进制值",
      description: biasedExp === 0 || biasedExp === 255
        ? `特殊值: ${result}`
        : `(-1)^${sign} × (1 + 0.${mantissaBits}) × 2^(${biasedExp} - 127) = (-1)^${sign} × ${result < 0 ? `(${result})` : result}`,
      codeLine: line,
    });
  }

  // ── 工具 ──

  private fracToBinary(frac: number, bits: number): string {
    let result = "";
    for (let i = 0; i < bits; i++) {
      frac *= 2;
      if (frac >= 1) {
        result += "1";
        frac -= 1;
      } else {
        result += "0";
      }
    }
    return result;
  }
}
