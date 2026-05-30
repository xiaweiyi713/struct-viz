import type {
  Literal,
  VisualStructure,
  VisualArrayItem,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

// ── TwosComplementRuntime ──

export class TwosComplementRuntime implements StructureRuntime {
  private arrays: VisualArrayItem[][] = [[], [], [], []];
  private labels = ["操作数A", "操作数B", "结果", "标志位"];
  private lastOp = "";

  // ── 工具方法 ──

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

  /** 将二进制字符串拆分为单个字符的数组 */
  private binaryToItems(prefix: string, bin: string, status: VisualArrayItem["status"] = "default"): VisualArrayItem[] {
    return bin.split("").map((bit, i) => this.makeItem(`${prefix}-${i}`, parseInt(bit), status));
  }

  // ── StructureRuntime 实现 ──

  executeMethod(
    method: string,
    args: Literal[],
    recorder: TraceRecorder,
    line: number,
  ): void {
    switch (method) {
      case "add":
        this.doAdd(Number(args[0]), Number(args[1]), Number(args[2] ?? 8), recorder, line);
        break;
      case "sub":
        this.doSub(Number(args[0]), Number(args[1]), Number(args[2] ?? 8), recorder, line);
        break;
      default:
        throw new Error(`TwosComplement 不支持方法 "${method}"`);
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

  // ── 补码加法 ──

  private doAdd(a: number, b: number, bits: number, recorder: TraceRecorder, line: number): void {
    this.lastOp = "加法";
    const binA = this.toTwosComplement(a, bits);
    const binB = this.toTwosComplement(b, bits);

    // 步骤1：显示操作数A
    this.arrays[0] = this.binaryToItems("a", binA);
    recorder.record({
      type: "CHECK_INVARIANT",
      title: "操作数 A 的补码表示",
      description: `A = ${a}，${bits}位补码表示为 ${binA}（十进制 ${this.fromTwosComplement(binA)}）`,
      codeLine: line,
    });

    // 步骤2：显示操作数B
    this.arrays[1] = this.binaryToItems("b", binB);
    recorder.record({
      type: "CHECK_INVARIANT",
      title: "操作数 B 的补码表示",
      description: `B = ${b}，${bits}位补码表示为 ${binB}（十进制 ${this.fromTwosComplement(binB)}）`,
      codeLine: line,
    });

    // 步骤3：逐位相加（从最低位开始）
    const resultBits: string[] = [];
    let carry = 0;

    for (let i = bits - 1; i >= 0; i--) {
      const bitA = parseInt(binA[i]);
      const bitB = parseInt(binB[i]);
      const sum = bitA + bitB + carry;
      const resultBit = sum % 2;
      const newCarry = Math.floor(sum / 2);
      resultBits.unshift(String(resultBit));
      carry = newCarry;
    }

    const resultBin = resultBits.join("");
    const resultDec = this.fromTwosComplement(resultBin);

    // 步骤3：逐位计算过程
    const resultItems = this.binaryToItems("r", resultBin);
    // 高亮最低位
    resultItems[bits - 1] = this.makeItem("r-0", parseInt(resultBin[bits - 1]), "active");
    this.arrays[2] = resultItems;
    recorder.record({
      type: "FILL_CELL",
      title: "逐位相加",
      description: `从最低位开始逐位相加，当前位 ${binA[bits - 1]} + ${binB[bits - 1]} + 0(初始进位) = ${resultBin[bits - 1]}`,
      codeLine: line,
    });

    // 显示完整结果
    this.arrays[2] = resultItems.map((item) => ({ ...item, status: "highlighted" as const }));
    recorder.record({
      type: "FILL_CELL",
      title: "加法完成",
      description: `结果补码: ${resultBin}，十进制: ${resultDec}，最高进位: ${carry}`,
      codeLine: line,
    });

    // 步骤4：溢出检测
    const signA = binA[0];
    const signB = binB[0];
    const signR = resultBin[0];
    const overflow = signA === signB && signA !== signR;

    // 标志位数组：[进位CF, 溢出OF, 零标志ZF, 符号标志SF]
    const flags = [
      this.makeItem("cf", carry, carry ? "highlighted" : "default"),
      this.makeItem("of", overflow ? 1 : 0, overflow ? "highlighted" : "default"),
      this.makeItem("zf", resultDec === 0 ? 1 : 0, resultDec === 0 ? "highlighted" : "default"),
      this.makeItem("sf", parseInt(signR), "default"),
    ];
    this.arrays[3] = flags;
    this.labels = ["操作数A", "操作数B", "结果", "标志位[CF,OF,ZF,SF]"];

    recorder.record({
      type: "CHECK_INVARIANT",
      title: "标志位与溢出检测",
      description: `CF(进位)=${carry}，OF(溢出)=${overflow ? 1 : 0}，ZF(零)=${resultDec === 0 ? 1 : 0}，SF(符号)=${signR}。${overflow ? "⚠ 溢出！两个同号数相加得到异号结果" : "无溢出"}`,
      codeLine: line,
    });
  }

  // ── 补码减法 ──

  private doSub(a: number, b: number, bits: number, recorder: TraceRecorder, line: number): void {
    this.lastOp = "减法";
    const binA = this.toTwosComplement(a, bits);
    const binB = this.toTwosComplement(b, bits);

    // 步骤1：显示操作数A
    this.arrays[0] = this.binaryToItems("a", binA);
    recorder.record({
      type: "CHECK_INVARIANT",
      title: "操作数 A 的补码表示",
      description: `A = ${a}，${bits}位补码表示为 ${binA}（十进制 ${this.fromTwosComplement(binA)}）`,
      codeLine: line,
    });

    // 步骤2：显示操作数B（取反+1）
    const binBInv = binB.split("").map(c => c === "0" ? "1" : "0").join("");
    const binBComp = this.toTwosComplement(-b, bits);

    this.arrays[1] = this.binaryToItems("b", binB, "active");
    recorder.record({
      type: "CHECK_INVARIANT",
      title: "操作数 B 的补码表示",
      description: `B = ${b}，补码表示为 ${binB}`,
      codeLine: line,
    });

    // 步骤3：对B取反
    this.arrays[1] = this.binaryToItems("b-inv", binBInv, "highlighted");
    recorder.record({
      type: "FILL_CELL",
      title: "对 B 按位取反",
      description: `~B = ${binB} → ${binBInv}（按位取反）`,
      codeLine: line,
    });

    // 步骤4：取反后加1
    this.arrays[1] = this.binaryToItems("b-comp", binBComp, "highlighted");
    recorder.record({
      type: "FILL_CELL",
      title: "取反后加1得 -B",
      description: `~B + 1 = ${binBInv} + 1 = ${binBComp}（-B 的补码表示）`,
      codeLine: line,
    });

    // 步骤5：A + (-B)
    let carry = 0;
    const resultBits: string[] = [];

    for (let i = bits - 1; i >= 0; i--) {
      const bitA = parseInt(binA[i]);
      const bitB = parseInt(binBComp[i]);
      const sum = bitA + bitB + carry;
      resultBits.unshift(String(sum % 2));
      carry = Math.floor(sum / 2);
    }

    const resultBin = resultBits.join("");
    const resultDec = this.fromTwosComplement(resultBin);

    this.arrays[2] = this.binaryToItems("r", resultBin).map(item => ({ ...item, status: "highlighted" as const }));
    recorder.record({
      type: "FILL_CELL",
      title: "A + (-B) 得到结果",
      description: `${binA} + ${binBComp} = ${resultBin}，十进制: ${resultDec}，最高进位: ${carry}`,
      codeLine: line,
    });

    // 步骤6：溢出检测
    const signA = binA[0];
    const signBComp = binBComp[0];
    const signR = resultBin[0];
    // 减法溢出：A与-B同号，结果与A异号
    const overflow = signA === signBComp && signA !== signR;

    const flags = [
      this.makeItem("cf", carry, carry ? "highlighted" : "default"),
      this.makeItem("of", overflow ? 1 : 0, overflow ? "highlighted" : "default"),
      this.makeItem("zf", resultDec === 0 ? 1 : 0, resultDec === 0 ? "highlighted" : "default"),
      this.makeItem("sf", parseInt(signR), "default"),
    ];
    this.arrays[3] = flags;
    this.labels = ["操作数A", "-B(取反+1)", "结果", "标志位[CF,OF,ZF,SF]"];

    recorder.record({
      type: "CHECK_INVARIANT",
      title: "标志位与溢出检测",
      description: `CF(进位)=${carry}，OF(溢出)=${overflow ? 1 : 0}，ZF(零)=${resultDec === 0 ? 1 : 0}，SF(符号)=${signR}。${overflow ? "⚠ 溢出！" : "无溢出"}。A - B = ${a} - ${b} = ${resultDec}`,
      codeLine: line,
    });
  }
}
