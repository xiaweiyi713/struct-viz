import type {
  Literal,
  VisualStructure,
  VisualArrayItem,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

// ── SubnettingRuntime ──

export class SubnettingRuntime implements StructureRuntime {
  private originalIP: string = "";
  private ipBinary: string = "";
  private maskBinary: string = "";
  private networkPart: string = "";
  private hostPart: string = "";
  private subnets: { network: string; broadcast: string; range: string; mask: string; binary: string }[] = [];

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
    if (method !== "divide") throw new Error(`Subnetting 不支持方法 "${method}"`);
    this.doDivide(
      Number(args[0]), Number(args[1]), Number(args[2]), Number(args[3]),
      Number(args[4]), Number(args[5]),
      recorder, line,
    );
  }

  getSnapshot(): VisualStructure {
    return {
      type: "multiarray",
      arrays: [
        this.makeItems(this.ipBinary, "default", "ip-"),
        this.makeItems(this.maskBinary, "active", "mask-"),
        this.makeItems(this.networkPart, "highlighted", "net-"),
        this.makeItems(this.hostPart, "default", "host-"),
      ],
      labels: [
        `网络地址: ${this.originalIP}`,
        "子网掩码",
        "网络位",
        "主机位",
      ],
    };
  }

  getVariables(): Record<string, RuntimeValue> {
    return {
      ip: { type: "string", value: this.originalIP, display: this.originalIP },
      binaryIP: { type: "string", value: this.ipBinary, display: this.ipBinary },
      mask: { type: "string", value: this.maskBinary, display: this.maskBinary },
      subnetCount: { type: "number", value: this.subnets.length, display: `${this.subnets.length}` },
    };
  }

  private ipToBinary(a: number, b: number, c: number, d: number): string {
    return [a, b, c, d]
      .map((octet) => octet.toString(2).padStart(8, "0"))
      .join("");
  }

  private binaryToIP(binary: string): string {
    const octets = [
      parseInt(binary.substring(0, 8), 2),
      parseInt(binary.substring(8, 16), 2),
      parseInt(binary.substring(16, 24), 2),
      parseInt(binary.substring(24, 32), 2),
    ];
    return octets.join(".");
  }

  private doDivide(
    a: number, b: number, c: number, d: number,
    prefixLen: number, subnetCount: number,
    recorder: TraceRecorder, line: number,
  ): void {
    this.originalIP = `${a}.${b}.${c}.${d}/${prefixLen}`;
    this.ipBinary = this.ipToBinary(a, b, c, d);

    recorder.record({
      type: "VISIT_NODE",
      title: "IP 地址二进制表示",
      description: `IP 地址: ${this.originalIP}，二进制: ${this.ipBinary}`,
      codeLine: line,
      targets: [],
    });

    // 计算需要借用的位数
    const borrowBits = Math.ceil(Math.log2(subnetCount));
    const newPrefixLen = prefixLen + borrowBits;
    const hostBits = 32 - newPrefixLen;

    // 子网掩码
    this.maskBinary = "1".repeat(newPrefixLen) + "0".repeat(32 - newPrefixLen);

    recorder.record({
      type: "COMPARE",
      title: "子网掩码计算",
      description: `原前缀: /${prefixLen}，借用 ${borrowBits} 位，新前缀: /${newPrefixLen}，子网掩码: ${this.maskBinary}`,
      codeLine: line,
      targets: [],
    });

    // 网络部分和主机部分
    this.networkPart = this.ipBinary.substring(0, newPrefixLen);
    this.hostPart = this.ipBinary.substring(newPrefixLen);

    recorder.record({
      type: "COMPARE",
      title: "划分网络位和主机位",
      description: `网络位(${newPrefixLen}位): ${this.networkPart}，主机位(${hostBits}位): ${this.hostPart}`,
      codeLine: line,
      targets: [],
    });

    // 计算每个子网
    const actualSubnets = Math.pow(2, borrowBits);
    const networkPrefix = this.ipBinary.substring(0, prefixLen);
    this.subnets = [];

    for (let i = 0; i < actualSubnets; i++) {
      // 子网号部分
      const subnetBits = i.toString(2).padStart(borrowBits, "0");
      const fullNetwork = networkPrefix + subnetBits;
      const hostZeros = "0".repeat(hostBits);
      const hostOnes = "1".repeat(hostBits);

      const networkAddr = fullNetwork + hostZeros;
      const broadcastAddr = fullNetwork + hostOnes;

      // 计算第一个和最后一个可用主机地址（hostBits >= 2 时才有可用主机）
      let range: string;
      if (hostBits >= 2) {
        const firstHostBinary = fullNetwork + "0".repeat(hostBits - 1) + "1";
        const lastHostBinary = fullNetwork + "1".repeat(hostBits - 1) + "0";
        range = `${this.binaryToIP(firstHostBinary)} - ${this.binaryToIP(lastHostBinary)}`;
      } else if (hostBits === 1) {
        // 只有网络地址和广播地址，无可用主机
        range = "无可用主机";
      } else {
        // hostBits === 0，极端情况
        range = "无可用主机";
      }

      const subnetInfo = {
        network: this.binaryToIP(networkAddr),
        broadcast: this.binaryToIP(broadcastAddr),
        range,
        mask: this.binaryToIP(this.maskBinary),
        binary: fullNetwork,
      };
      this.subnets.push(subnetInfo);

      recorder.record({
        type: "MARK_FINAL",
        title: `子网 ${i + 1}: ${subnetInfo.network}/${newPrefixLen}`,
        description: `子网位: ${subnetBits}，网络地址: ${subnetInfo.network}，广播地址: ${subnetInfo.broadcast}，可用主机范围: ${subnetInfo.range}`,
        codeLine: line,
        targets: [],
      });
    }
  }
}
