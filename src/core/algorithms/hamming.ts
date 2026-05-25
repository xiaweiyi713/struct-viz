import type {
  Literal,
  VisualStructure,
  VisualArrayItem,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

// ── HammingRuntime ──

export class HammingRuntime implements StructureRuntime {
  private arrays: VisualArrayItem[][] = [];
  private labels: string[] = [];
  private lastOp = "";

  private makeItem(id: string, value: number | string, status: VisualArrayItem["status"] = "default"): VisualArrayItem {
    return { id, value, status };
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
      case "detect":
        this.doDetect(Number(args[0]), recorder, line);
        break;
      default:
        throw new Error(`Hamming 不支持方法 "${method}"`);
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

  /** 将数字转为二进制位数组 */
  private toBits(value: number): number[] {
    if (value === 0) return [0];
    const bits: number[] = [];
    let v = Math.abs(value);
    while (v > 0) {
      bits.unshift(v % 2);
      v = Math.floor(v / 2);
    }
    return bits;
  }

  /** 计算需要的校验位数量 */
  private calcParityCount(dataBits: number): number {
    let r = 0;
    while (Math.pow(2, r) < dataBits + r + 1) {
      r++;
    }
    return r;
  }

  // ── 海明码编码 ──

  private doEncode(data: number, recorder: TraceRecorder, line: number): void {
    this.lastOp = `海明码编码 data=${data}`;
    this.arrays = [];
    this.labels = [];

    const dataBits = this.toBits(data);
    const m = dataBits.length;
    const r = this.calcParityCount(m);
    const n = m + r; // 总位数

    recorder.record({
      type: "CHECK_INVARIANT",
      title: "开始海明码编码",
      description: `数据 ${data} → 二进制 ${dataBits.join("")}（${m} 位），需要 ${r} 个校验位，海明码总长 ${n} 位`,
      codeLine: line,
    });

    // 展示原始数据位
    this.arrays.push(
      dataBits.map((b, i) => this.makeItem(`data-${i}`, b, "default"))
    );
    this.labels.push(`原始数据位 (${m}位): ${dataBits.join("")}`);

    // 构建海明码（1-indexed）
    // 校验位放在 2^k 的位置（1, 2, 4, 8, ...）
    const code: (number | null)[] = new Array(n + 1).fill(null); // 1-indexed
    const parityPositions: number[] = [];
    for (let i = 0; i < r; i++) {
      const pos = Math.pow(2, i);
      parityPositions.push(pos);
      code[pos] = 0; // 校验位初始为 0
    }

    // 填入数据位
    let dataIndex = 0;
    for (let i = 1; i <= n; i++) {
      if (!parityPositions.includes(i)) {
        code[i] = dataBits[dataIndex++];
      }
    }

    // 计算校验位
    for (const pPos of parityPositions) {
      let parity = 0;
      for (let i = 1; i <= n; i++) {
        if (i === pPos) continue;
        if ((i & pPos) !== 0 && code[i] !== null) {
          parity ^= code[i]!;
        }
      }
      code[pPos] = parity;
    }

    // 展示校验位计算
    for (const pPos of parityPositions) {
      const relatedBits: string[] = [];
      for (let i = 1; i <= n; i++) {
        if (i !== pPos && (i & pPos) !== 0) {
          relatedBits.push(`D${i}=${code[i]}`);
        }
      }

      recorder.record({
        type: "COMPARE",
        title: `计算校验位 P${pPos}（位置${pPos}）= ${code[pPos]}`,
        description: `位置${pPos} 覆盖的位: ${relatedBits.join(", ")}。异或结果 = ${code[pPos]}`,
        codeLine: line,
      });

      const codeDisplay: VisualArrayItem[] = [];
      for (let i = 1; i <= n; i++) {
        const isParity = i === pPos;
        const isRelated = (i & pPos) !== 0 && i !== pPos;
        const status = isParity ? "highlighted" : isRelated ? "active" : "default";
        codeDisplay.push(this.makeItem(`calc-${pPos}-${i}`, code[i] ?? "?", status));
      }
      this.arrays.push(codeDisplay);
      this.labels.push(`计算 P${pPos}: 覆盖位异或 = ${code[pPos]}`);
    }

    // 最终海明码
    const finalCode = code.slice(1).map(b => b ?? 0);
    this.arrays.push(
      finalCode.map((b, i) => {
        const pos = i + 1;
        const isParity = parityPositions.includes(pos);
        return this.makeItem(`final-${i}`, b, isParity ? "highlighted" : "default");
      })
    );
    this.labels.push(`海明码: ${finalCode.join("")}（高亮为校验位）`);

    recorder.record({
      type: "MARK_FINAL",
      title: `海明码编码完成`,
      description: `数据 ${data} → 海明码 ${finalCode.join("")}（${n} 位，其中 ${r} 位校验位）。可纠正 1 位错误`,
      codeLine: line,
      payload: { data, hammingCode: finalCode.join(""), dataBits: m, parityBits: r },
    });
  }

  // ── 海明码检错纠错 ──

  private doDetect(codeValue: number, recorder: TraceRecorder, line: number): void {
    this.lastOp = `海明码检错 code=${codeValue}`;
    this.arrays = [];
    this.labels = [];

    const codeBits = this.toBits(codeValue);
    const n = codeBits.length;

    // 确定校验位数
    let r = 0;
    while (Math.pow(2, r) <= n) r++;

    recorder.record({
      type: "CHECK_INVARIANT",
      title: "开始海明码检错",
      description: `接收码字 ${codeValue} → 二进制 ${codeBits.join("")}（${n} 位），${r} 个校验位`,
      codeLine: line,
    });

    this.arrays.push(
      codeBits.map((b, i) => this.makeItem(`recv-${i}`, b, "default"))
    );
    this.labels.push(`接收码字: ${codeBits.join("")}`);

    // 计算伴随式（syndrome）
    const parityPositions: number[] = [];
    for (let i = 0; i < r; i++) {
      parityPositions.push(Math.pow(2, i));
    }

    let syndrome = 0;
    for (const pPos of parityPositions) {
      let parity = 0;
      for (let i = 1; i <= n; i++) {
        if ((i & pPos) !== 0) {
          parity ^= codeBits[i - 1];
        }
      }

      const syndromeBit = parity;
      syndrome += syndromeBit * pPos;

      const relatedBits: string[] = [];
      for (let i = 1; i <= n; i++) {
        if ((i & pPos) !== 0) {
          relatedBits.push(`C${i}=${codeBits[i - 1]}`);
        }
      }

      recorder.record({
        type: "COMPARE",
        title: `校验 P${pPos}: S${Math.log2(pPos)} = ${syndromeBit}`,
        description: `覆盖位: ${relatedBits.join(", ")}。异或 = ${syndromeBit}`,
        codeLine: line,
      });
    }

    if (syndrome === 0) {
      recorder.record({
        type: "MARK_FINAL",
        title: "无错误",
        description: `伴随式 S = 0，接收码字无错误`,
        codeLine: line,
        payload: { syndrome: 0, error: false },
      });
    } else {
      // 纠错：翻转错误位
      if (syndrome <= n) {
        const errorPos = syndrome;
        codeBits[errorPos - 1] ^= 1;

        this.arrays.push(
          codeBits.map((b, i) => {
            const status = (i + 1) === errorPos ? "highlighted" : "default";
            return this.makeItem(`corr-${i}`, b, status);
          })
        );
        this.labels.push(`纠正后: ${codeBits.join("")}（位置${errorPos}已翻转）`);

        recorder.record({
          type: "MARK_FINAL",
          title: `发现并纠正错误（位置 ${errorPos}）`,
          description: `伴随式 S = ${syndrome}，错误位置 = ${errorPos}。已翻转，纠正后码字: ${codeBits.join("")}`,
          codeLine: line,
          payload: { syndrome, errorPos, correctedCode: codeBits.join("") },
        });
      } else {
        recorder.record({
          type: "MARK_FINAL",
          title: `伴随式 S = ${syndrome}，多位错误（无法纠正）`,
          description: `伴随式 ${syndrome} 超出码长 ${n}，可能发生多位错误`,
          codeLine: line,
          payload: { syndrome, error: true },
        });
      }
    }
  }
}
