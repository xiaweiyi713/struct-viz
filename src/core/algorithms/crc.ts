import type {
  Literal,
  VisualStructure,
  VisualArrayItem,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

// ── CRCRuntime ──

export class CRCRuntime implements StructureRuntime {
  private dataBits: string = "";
  private generator: string = "";
  private paddedData: string = "";
  private currentRemainder: string = "";
  private finalResult: string = "";
  private stepInfo: string = "";

  /** 将十进制数字转为二进制字符串（每一位当作一个 bit） */
  private numToBitString(n: number): string {
    return String(n);
  }

  /** XOR 两个等长二进制串 */
  private xor(a: string, b: string): string {
    let result = "";
    for (let i = 0; i < a.length; i++) {
      result += a[i] === b[i] ? "0" : "1";
    }
    return result;
  }

  private makeItems(bits: string, status: VisualArrayItem["status"] = "default", prefix: string = ""): VisualArrayItem[] {
    return bits.split("").map((bit, i) => ({
      id: `${prefix}${i}`,
      value: bit,
      status,
    }));
  }

  executeMethod(
    method: string,
    args: Literal[],
    recorder: TraceRecorder,
    line: number,
  ): void {
    if (method !== "compute") throw new Error(`CRC 不支持方法 "${method}"`);
    this.doCompute(Number(args[0]), Number(args[1]), recorder, line);
  }

  getSnapshot(): VisualStructure {
    return {
      type: "multiarray",
      arrays: [
        this.makeItems(this.dataBits, "default", "d-"),
        this.makeItems(this.paddedData, "default", "p-"),
        this.makeItems(this.generator, "active", "g-"),
        this.makeItems(this.currentRemainder, "default", "r-"),
        this.makeItems(this.finalResult, "highlighted", "f-"),
      ],
      labels: [
        "原始数据",
        "添加零后的数据",
        "生成多项式",
        "当前余数",
        "最终结果(数据+FCS)",
      ],
    };
  }

  getVariables(): Record<string, RuntimeValue> {
    return {
      dataBits: { type: "string", value: this.dataBits, display: this.dataBits },
      generator: { type: "string", value: this.generator, display: this.generator },
      remainder: { type: "string", value: this.currentRemainder, display: this.currentRemainder || "-" },
      result: { type: "string", value: this.finalResult, display: this.finalResult || "-" },
      step: { type: "string", value: this.stepInfo, display: this.stepInfo || "-" },
    };
  }

  private doCompute(dataNum: number, genNum: number, recorder: TraceRecorder, line: number): void {
    // 将数字当作二进制串处理
    this.dataBits = this.numToBitString(dataNum);
    this.generator = this.numToBitString(genNum);
    this.finalResult = "";
    this.currentRemainder = "";

    const dataLen = this.dataBits.length;
    const genLen = this.generator.length;

    // 在数据后补 genLen - 1 个零
    const padding = "0".repeat(genLen - 1);
    this.paddedData = this.dataBits + padding;

    recorder.record({
      type: "VISIT_NODE",
      title: "CRC 校验初始化",
      description: `原始数据: ${this.dataBits}，生成多项式: ${this.generator}，数据长度: ${dataLen}，补零: ${genLen - 1} 个`,
      codeLine: line,
      targets: [],
    });

    // 执行模2除法（异或运算）
    let remainder = this.paddedData.substring(0, genLen);
    this.currentRemainder = remainder;

    recorder.record({
      type: "COMPARE",
      title: "取前 " + genLen + " 位",
      description: `取出数据的前 ${genLen} 位: ${remainder}`,
      codeLine: line,
      targets: [],
    });

    for (let i = genLen; i < this.paddedData.length; i++) {
      // 根据首位决定是对齐生成多项式还是对齐全零
      let divisor: string;
      if (remainder[0] === "1") {
        divisor = this.generator;
        this.stepInfo = `${remainder} XOR ${this.generator}`;
        remainder = this.xor(remainder, this.generator);
      } else {
        divisor = "0".repeat(genLen);
        this.stepInfo = `${remainder} XOR ${divisor} (首位为0)`;
        remainder = this.xor(remainder, divisor);
      }

      // 去掉前导零，补上下一位
      remainder = remainder.substring(1) + this.paddedData[i];
      this.currentRemainder = remainder;

      recorder.record({
        type: "COMPARE",
        title: `第 ${i - genLen + 1} 步异或运算`,
        description: `${this.stepInfo} = ${remainder.substring(0, genLen - 1)}，然后补入第 ${i + 1} 位 "${this.paddedData[i]}"，当前余数: ${remainder}`,
        codeLine: line,
        targets: [],
      });
    }

    // 最后一次异或
    if (remainder[0] === "1") {
      this.stepInfo = `${remainder} XOR ${this.generator}`;
      remainder = this.xor(remainder, this.generator);
    } else {
      const zeros = "0".repeat(genLen);
      this.stepInfo = `${remainder} XOR ${zeros} (首位为0)`;
      remainder = this.xor(remainder, zeros);
    }
    remainder = remainder.substring(1);

    this.currentRemainder = remainder;

    // FCS 是最终的余数
    const fcs = remainder.padStart(genLen - 1, "0");
    this.finalResult = this.dataBits + fcs;

    recorder.record({
      type: "MARK_FINAL",
      title: "CRC 校验完成",
      description: `最终余数(FCS): ${fcs}，发送数据(原始数据+FCS): ${this.finalResult}`,
      codeLine: line,
      targets: [],
    });
  }
}
