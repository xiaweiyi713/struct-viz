/**
 * 计算机组成原理 + 计算机网络 模板逐个验证（共 23 个）
 *
 * 方法：取 templates.ts 中每个模板的精确 code，用 parse + createRuntime().execute
 * （与线上 Worker 同一套管线）执行，然后对照**独立手算**的期望值断言。
 * 手算过程见各 it 上方的注释；期望值绝不来自"我跑出来是什么就断言什么"。
 *
 * 已知问题（测试会如实 FAIL，见报告）：
 * - co-float-add：浮点加法尾数进位被丢弃，0.75+0.5 算成 0.25
 * - cn-gbn：超时重传了已被 ACK 的帧，违背 GBN 定义
 */
import { describe, it, expect } from "vitest";
import { parse } from "../parser/parser";
import { createRuntime } from "../executor";
import { getTemplateById } from "../../data/templates";
import type { ExecutionResult } from "../executor/runtime";

const CO_CN_IDS = [
  "co-twos-complement",
  "co-ieee754",
  "co-booth",
  "co-cache-direct",
  "co-cache-set",
  "co-pipeline-basic",
  "co-pipeline-hazard",
  "co-float-add",
  "co-cache-fully",
  "co-virtual-addr",
  "co-sign-magnitude-mul",
  "co-pipeline-superscalar",
  "cn-crc",
  "cn-gbn",
  "cn-sr",
  "cn-subnet",
  "cn-distance-vector",
  "cn-tcp-state",
  "cn-hamming",
  "cn-csma",
  "cn-link-state",
  "cn-nat",
  "cn-tcp-congestion",
] as const;

/** 用模板的精确 code 执行，返回执行结果（先断言 parse/execute 无错、帧非空） */
function execTemplate(id: string): ExecutionResult {
  const tpl = getTemplateById(id);
  expect(tpl, `模板 ${id} 必须存在`).toBeDefined();
  const parsed = parse(tpl!.code);
  expect(parsed.errors, `${id} parse errors`).toHaveLength(0);
  expect(parsed.program, `${id} program`).toBeDefined();
  const runtime = createRuntime();
  const result = runtime.execute(parsed.program!);
  expect(result.errors, `${id} exec errors`).toHaveLength(0);
  expect(result.frames.length, `${id} frames 非空`).toBeGreaterThan(0);
  return result;
}

/** 取某帧快照中 multiarray 结构各行拼成的位串 */
function multiarrayRows(r: ExecutionResult, step: number, varName: string): string[] {
  const frame = r.frames[step];
  const s = frame.snapshot.structures[varName] as {
    type: string;
    arrays: { value: number | string }[][];
  };
  return s.arrays.map((row) => row.map((c) => String(c.value)).join(""));
}

/** 最后一帧的 variables */
function lastVars(r: ExecutionResult): Record<string, string> {
  const last = r.frames[r.frames.length - 1];
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(last.snapshot.variables ?? {})) {
    out[k] = String(v.display ?? v.value);
  }
  return out;
}

/** 所有事件的 title+description 拼接，用于查找关键步骤文本 */
function allEventText(r: ExecutionResult): string[] {
  return r.frames.map((f) => `${f.event.title} ${f.event.description}`);
}

function countMatches(r: ExecutionResult, re: RegExp): number {
  return allEventText(r).filter((t) => re.test(t)).length;
}

// ──────────────────── 计算机组成原理 ────────────────────

describe("计算机组成原理模板验证", () => {
  it("co-twos-complement 补码加减法", () => {
    // 手算：add(6,-3,8): 6=00000110, -3=11111101, 相加=100000011→00000011=3, 进位1, 无溢出
    //       sub(6,3,8): -B=11111101, 00000110+11111101=00000011=3
    const r = execTemplate("co-twos-complement");
    // 加法完成帧（step 3）：结果行应为 00000011
    expect(multiarrayRows(r, 3, "tc")[2]).toBe("00000011");
    // 最后一帧是减法：结果行 00000011（十进制 3），标志位 [CF,OF,ZF,SF]=[1,0,0,0]
    const last = multiarrayRows(r, r.frames.length - 1, "tc");
    expect(last[0]).toBe("00000110"); // A=6
    expect(last[1]).toBe("11111101"); // -B=-3 的补码
    expect(last[2]).toBe("00000011"); // 结果=3
    expect(last[3]).toBe("1000"); // CF=1,OF=0,ZF=0,SF=0
    expect(allEventText(r).some((t) => t.includes("A - B = 6 - 3 = 3"))).toBe(true);
  });

  it("co-ieee754 IEEE754 编解码", () => {
    // 手算：6.625=1.10101₂×2² → S=0,E=129=10000001,M=10101000000000000000000
    //       -12.375=1.100011₂×2³ → S=1,E=130=10000010,M=10001100000000000000000
    //       decode(0100000110101010...): S=0,E=131→指数4,M=010101...→1.328125×16=21.25
    const r = execTemplate("co-ieee754");
    const texts = allEventText(r);
    expect(
      texts.some((t) => t.includes("完整32位: 01000000110101000000000000000000")),
    ).toBe(true);
    expect(
      texts.some((t) => t.includes("完整32位: 11000001010001100000000000000000")),
    ).toBe(true);
    expect(texts.some((t) => t.includes("21.25"))).toBe(true);
  });

  it("co-booth Booth 乘法", () => {
    // 手算 4 位 Booth：M=0111(7),-M=1001,Q=1101(-3)
    // s1: Q0Q-1=10→A=A-M=1001, 右移→A=1100,Q=1110,Q-1=1
    // s2: 01→A=A+M=0011, 右移→A=0001,Q=1111,Q-1=0
    // s3: 10→A=A-M=1010, 右移→A=1101,Q=0111,Q-1=1
    // s4: 11→无操作, 右移→A=1110,Q=1011
    // 乘积=A‖Q=11101011₂=-21=7×(-3) ✓
    const r = execTemplate("co-booth");
    const texts = allEventText(r);
    expect(texts.some((t) => t.includes("乘积 = A concat Q = 11101011"))).toBe(true);
    expect(texts.some((t) => t.includes("十进制: -21"))).toBe(true);
    expect(texts.some((t) => t.includes("7 × -3 = -21"))).toBe(true);
    // 中间寄存器状态也应与手算一致
    expect(texts.some((t) => t.includes("右移后 A = 1100，Q = 1110"))).toBe(true);
    expect(texts.some((t) => t.includes("右移后 A = 0001，Q = 1111"))).toBe(true);
  });

  it("co-cache-direct 直接映射", () => {
    // 手算：4 行，块号%4=行号。序列 0,4,8,0,6,8：
    // 块0→行0缺失；块4→行0(Tag1≠0)缺失；块8→行0(Tag2≠1)缺失；
    // 块0→行0(Tag0≠2)缺失；块6→行2(Tag1)缺失；块8→行0(Tag2≠0)缺失 → 6 次全缺失
    const r = execTemplate("co-cache-direct");
    expect(countMatches(r, /缺失！/)).toBe(6);
    expect(countMatches(r, /命中！/)).toBe(0);
    const texts = allEventText(r);
    expect(texts.some((t) => t.includes("6 mod 4") && t.includes("Tag = 1"))).toBe(true);
  });

  it("co-cache-set 组相联映射", () => {
    // 手算：2 路×2 组，组号=块号%2，Tag=块号/2。序列 0,1,4,5,0,1：
    // 块0→组0缺失；块1→组1缺失；块4→组0(Tag2)缺失；块5→组1(Tag2)缺失；
    // 块0→组0(Tag0)命中；块1→组1(Tag0)命中 → 4 缺失 2 命中
    const r = execTemplate("co-cache-set");
    expect(countMatches(r, /缺失！/)).toBe(4);
    expect(countMatches(r, /命中！/)).toBe(2);
    const texts = allEventText(r);
    expect(texts.some((t) => t.includes("命中！块 0 在组 0 第 0 路"))).toBe(true);
    expect(texts.some((t) => t.includes("命中！块 1 在组 1 第 0 路"))).toBe(true);
  });

  it("co-pipeline-basic 基本流水线", () => {
    // 手算：5 指令×5 阶段无冒险，总周期=K+N-1=9；加速比=25/9≈2.78
    const r = execTemplate("co-pipeline-basic");
    const texts = allEventText(r);
    expect(texts.some((t) => t.includes("总周期数: 9"))).toBe(true);
    // 第 5 周期应是 I1:WB,I2:MEM,I3:EX,I4:ID,I5:IF
    const c5 = r.frames.find((f) => f.event.title === "周期 5");
    expect(c5!.event.description).toContain("I1: WB");
    expect(c5!.event.description).toContain("I5: IF");
    const c9 = r.frames.find((f) => f.event.title === "周期 9");
    expect(c9!.event.description).toContain("I5: WB");
  });

  it("co-pipeline-hazard 数据冒险流水线", () => {
    // 手算（无转发，stall 至生产者 WB）：I1:IF@1…WB@5；I2 冒险 stall 3 拍，IF@5…WB@9；
    // I3:IF@6…WB@10；I4 冒险 stall，IF@10…WB@14；I5:IF@11…WB@15 → 共 15 周期
    const r = execTemplate("co-pipeline-hazard");
    const texts = allEventText(r);
    expect(texts.some((t) => t.includes("总周期数: 15"))).toBe(true);
    const c15 = r.frames.find((f) => f.event.title === "周期 15");
    expect(c15!.event.description).toContain("I5: WB");
    const c5 = r.frames.find((f) => f.event.title === "周期 5");
    expect(c5!.event.description).toContain("I1: WB");
    expect(c5!.event.description).toContain("I2: IF");
  });

  it("co-float-add 浮点加法", () => {
    // 手算：0.75=1.1₂×2⁻¹, 0.5=1.0₂×2⁻¹；尾数和=1.1+1.0=10.1₂（有进位）；
    // 右规→1.01₂×2⁰；S=0,E=127=01111111,M=0100…0 → 1.25
    // 期望：0.75 + 0.5 = 1.25，IEEE754: 0 01111111 01000000000000000000000
    const r = execTemplate("co-float-add");
    const texts = allEventText(r);
    expect(texts.some((t) => t.includes("0.75 + 0.5 = 1.25"))).toBe(true);
    expect(texts.some((t) => t.includes("0 01111111 01000000000000000000000"))).toBe(true);
  });

  it("co-cache-fully 全相联映射", () => {
    // 手算：4 行，块=地址/16。序列 0,4,8,16,0,32,8 → 块 0,0,0,1,0,2,0：
    // 缺失,命中,命中,缺失,命中,缺失,命中 → 4 命中 3 缺失，命中率 4/7=57.1%
    const r = execTemplate("co-cache-fully");
    const texts = allEventText(r);
    expect(texts.some((t) => t.includes("命中 4 次") && t.includes("缺失 3 次"))).toBe(true);
    expect(countMatches(r, /命中！/)).toBe(4);
    expect(countMatches(r, /缺失！/)).toBe(3);
  });

  it("co-virtual-addr 虚拟地址转换", () => {
    // 手算：VA=8192，页大小 4096 → 页号=2，偏移=0；
    // 页表项[2]=(有效1,页框8) → PA=8×4096+0=32768
    const r = execTemplate("co-virtual-addr");
    const texts = allEventText(r);
    expect(texts.some((t) => t.includes("页号 2"))).toBe(true);
    expect(texts.some((t) => t.includes("物理地址 = 32768"))).toBe(true);
    expect(lastVars(r)["va.operation"]).toContain("8192");
  });

  it("co-sign-magnitude-mul 原码一位乘", () => {
    // 手算：11×13，符号 0⊕0=0；Y=13=01101，Y[0..4]=1,0,1,1,0；
    // 绝对值：11×13=143=0010001111₂ ✓
    const r = execTemplate("co-sign-magnitude-mul");
    const texts = allEventText(r);
    expect(texts.some((t) => t.includes("绝对值乘积 = 0010001111（143）"))).toBe(true);
    expect(texts.some((t) => t.includes("最终结果 = 143"))).toBe(true);
    expect(texts.some((t) => t.includes("11 × 13 = 143"))).toBe(true);
  });

  it("co-pipeline-superscalar 超标量流水线", () => {
    // 手算：8 指令，发射宽度 2，5 阶段 → I8:IF@4…WB@8，共 8 周期；
    // 单发射需 5+8-1=12 周期，加速比 12/8=1.5x
    const r = execTemplate("co-pipeline-superscalar");
    const texts = allEventText(r);
    expect(texts.some((t) => t.includes("总周期: 8"))).toBe(true);
    expect(texts.some((t) => t.includes("加速比: 1.50x"))).toBe(true);
  });
});

// ──────────────────── 计算机网络 ────────────────────

describe("计算机网络模板验证", () => {
  it("cn-crc CRC 校验", () => {
    // 手算 GF(2) 多项式除法：1101011011 后补 4 个 0，除以 10011：
    // 逐位：11010^10011=01001→10011；^10011=00000→00001；首0→00010；
    // 首0→00101；首0→01011；首0→10110；^10011=00101→01010；
    // 首0→10100；^10011=00111→01110；余数 1110
    // 独立用整数模拟 GF(2) 除法复核：余数确为 1110
    const r = execTemplate("cn-crc");
    const vars = lastVars(r);
    expect(vars["crc.remainder"]).toBe("1110");
    expect(vars["crc.result"]).toBe("11010110111110");
    // 附带校验：余数多项式次数 < 生成多项式次数（4 < 5）
    expect(vars["crc.remainder"]!.length).toBe(4);
  });

  it("cn-gbn Go-Back-N 协议", () => {
    // 手算标准 GBN：窗口 4，共 8 帧，F3/F7 丢失。
    // F0,F1,F2 被 ACK（累计确认，base 应滑到 3）；
    // F3 超时 → 只重传已发送未确认的帧，即从最老未确认帧 F3 开始：[F3..F6]。
    // 模板自述亦要求"从该帧开始的所有帧都需要重传"。
    // 第二轮：F7 单独成窗口并丢失 → 超时重传 [F7..F7]。
    const r = execTemplate("cn-gbn");
    const retransmits = r.frames
      .map((f) => f.event.title)
      .filter((t) => t.startsWith("超时重传"));
    expect(retransmits.length).toBeGreaterThan(0);
    // 第一次超时（F3 丢失）必须从 F3 开始重传，不得包含已被 ACK 的 F0/F1/F2
    expect(retransmits[0].startsWith("超时重传 [F3")).toBe(true);
  });

  it("cn-sr 选择重传协议", () => {
    // 手算 SR：只重传丢失帧。F3 丢失→只重传 F3；F6 丢失→只重传 F6
    const r = execTemplate("cn-sr");
    const texts = allEventText(r);
    expect(texts.some((t) => t.includes("选择性重传 F3"))).toBe(true);
    expect(texts.some((t) => t.includes("选择性重传 F6"))).toBe(true);
    expect(texts.some((t) => t.includes("SR 传输完成"))).toBe(true);
    // SR 不应出现整窗口回退重传
    expect(countMatches(r, /超时重传/)).toBe(0);
  });

  it("cn-subnet 子网划分", () => {
    // 手算：192.168.1.0/24 划 4 个子网 → 借 2 位 → /26，掩码 255.255.255.192
    // 子网1: .0/26，网络 .0，广播 .63，主机 .1–.62
    // 子网2: .64/26，网络 .64，广播 .127，主机 .65–.126
    // 子网3: .128/26，网络 .128，广播 .191，主机 .129–.190
    // 子网4: .192/26，网络 .192，广播 .255，主机 .193–.254
    const r = execTemplate("cn-subnet");
    const vars = lastVars(r);
    expect(vars["sub.mask"]).toBe("11111111111111111111111111000000");
    expect(vars["sub.subnetCount"]).toBe("4");
    const texts = allEventText(r);
    expect(texts.some((t) => t.includes("192.168.1.0") && t.includes("192.168.1.63"))).toBe(true);
    expect(texts.some((t) => t.includes("192.168.1.64") && t.includes("192.168.1.127"))).toBe(true);
    expect(texts.some((t) => t.includes("192.168.1.128") && t.includes("192.168.1.191"))).toBe(true);
    expect(texts.some((t) => t.includes("192.168.1.192") && t.includes("192.168.1.255"))).toBe(true);
  });

  it("cn-distance-vector 距离向量路由", () => {
    // 手算最短路（链路 0-1:2, 0-2:7, 1-2:1, 1-3:3, 2-3:5）：
    // D0=[0,2,3,5], D1=[2,0,1,3], D2=[3,1,0,4], D3=[5,3,4,0]
    const r = execTemplate("cn-distance-vector");
    const last = r.frames[r.frames.length - 1];
    const m = last.snapshot.structures["dv"] as {
      cells: { row: number; col: number; value: number | string }[];
    };
    const grid: (number | string)[][] = Array.from({ length: 4 }, () => Array(4).fill(-1));
    for (const c of m.cells) grid[c.row][c.col] = c.value;
    expect(grid[0]).toEqual([0, 2, 3, 5]);
    expect(grid[1]).toEqual([2, 0, 1, 3]);
    expect(grid[2]).toEqual([3, 1, 0, 4]);
    expect(grid[3]).toEqual([5, 3, 4, 0]);
    expect(allEventText(r).some((t) => t.includes("算法收敛"))).toBe(true);
  });

  it("cn-tcp-state TCP 状态机", () => {
    // 手算标准 TCP 状态迁移（三次握手+四次挥手），共 12 次迁移
    const r = execTemplate("cn-tcp-state");
    const texts = allEventText(r).join("\n");
    const expectedTransitions = [
      "CLOSED → SYN_SENT",
      "CLOSED → LISTEN",
      "LISTEN → SYN_RCVD",
      "SYN_SENT → ESTABLISHED",
      "SYN_RCVD → ESTABLISHED",
      "ESTABLISHED → FIN_WAIT_1",
      "ESTABLISHED → CLOSE_WAIT",
      "FIN_WAIT_1 → FIN_WAIT_2",
      "CLOSE_WAIT → LAST_ACK",
      "FIN_WAIT_2 → TIME_WAIT",
      "LAST_ACK → CLOSED",
      "TIME_WAIT → CLOSED",
    ];
    for (const t of expectedTransitions) {
      expect(texts, `缺少状态迁移 ${t}`).toContain(t);
    }
    expect(texts).toContain("四次挥手完成");
  });

  it("cn-hamming 海明码", () => {
    // 手算 encode(11)：11=1011₂(4位)，r=3(2³≥4+3+1)，n=7；
    // 位置1,2,4为校验位；P1=1⊕0⊕1=0，P2=1⊕1⊕1=1，P4=0⊕1⊕1=0；
    // 码字=0110011（偶校验自洽）
    // detect(15)：实现按输入位宽 n=4 自洽计算伴随式，S=4→纠正位置4→1110
    const r = execTemplate("cn-hamming");
    const texts = allEventText(r);
    expect(texts.some((t) => t.includes("海明码 0110011"))).toBe(true);
    expect(texts.some((t) => t.includes("计算校验位 P1（位置1）= 0"))).toBe(true);
    expect(texts.some((t) => t.includes("计算校验位 P2（位置2）= 1"))).toBe(true);
    expect(texts.some((t) => t.includes("计算校验位 P4（位置4）= 0"))).toBe(true);
    expect(texts.some((t) => t.includes("纠正后码字: 1110"))).toBe(true);
  });

  it("cn-csma CSMA/CD 退避", () => {
    // 手算约束：第 k 次冲突后退避值必须 ∈ [0, 2^k - 1]；
    // k=1→[0,1], k=2→[0,3], k=3→[0,7], k=4→[0,15], k=5→[0,31]
    const r = execTemplate("cn-csma");
    const texts = allEventText(r);
    for (let k = 1; k <= 5; k++) {
      const round = texts.find((t) => t.includes(`第 ${k} 次冲突`));
      expect(round, `第 ${k} 轮冲突事件`).toBeDefined();
      const vals = [...round!.matchAll(/站\d=(\d+)/g)].map((m) => Number(m[1]));
      expect(vals.length).toBe(4);
      for (const v of vals) {
        expect(v, `k=${k} 退避值 ${v} 应 ∈ [0, ${2 ** k - 1}]`).toBeLessThanOrEqual(2 ** k - 1);
        expect(v).toBeGreaterThanOrEqual(0);
      }
    }
    // 每轮都应决出唯一发送者（或在首轮平局时明确再次冲突）
    expect(texts.some((t) => t.includes("获得发送权") || t.includes("再次冲突"))).toBe(true);
  });

  it("cn-link-state 链路状态路由", () => {
    // 手算 Dijkstra（源 N0）：dist=[0,∞,∞,∞,∞]
    // 访N0→N1=2,N2=5；访N1→N2=4,N3=6；访N2→N3=5,N4=7；访N3(5)；访N4(7)
    // 最终 [0,2,4,5,7]，前驱 [-,N0,N1,N2,N2]
    const r = execTemplate("cn-link-state");
    const texts = allEventText(r);
    expect(texts.some((t) => t.includes("最短路径: [0, 2, 4, 5, 7]"))).toBe(true);
    expect(texts.some((t) => t.includes("前驱: [-, N0, N1, N2, N2]"))).toBe(true);
    // 关键松弛步骤
    expect(texts.some((t) => t.includes("松弛 N1 → N2: dist[2] = 4"))).toBe(true);
    expect(texts.some((t) => t.includes("松弛 N2 → N3: dist[3] = 5"))).toBe(true);
  });

  it("cn-nat NAT 地址转换", () => {
    // 手算 NAPT：3 个私网端点共享公网 IP 203.0.113.1，分配不同端口 5000/5001/5002
    const r = execTemplate("cn-nat");
    const texts = allEventText(r);
    expect(texts.some((t) => t.includes("192.168.1.10:3000 → 203.0.113.1:5000"))).toBe(true);
    expect(texts.some((t) => t.includes("192.168.1.11:4000 → 203.0.113.1:5001"))).toBe(true);
    expect(texts.some((t) => t.includes("192.168.1.12:5000 → 203.0.113.1:5002"))).toBe(true);
    expect(lastVars(r)["nat.entries"]).toBe("3");
  });

  it("cn-tcp-congestion TCP 拥塞控制", () => {
    // 手算（cwnd=1,ssthresh=64，RTT8 丢包→3次重复ACK快重传）：
    // RTT1-6 慢启动: 1→2→4→8→16→32→64；RTT7 拥塞避免 64→65；
    // RTT8 丢包：ssthresh=65/2=32，快恢复 cwnd=32+3=35；
    // RTT9 快恢复结束 cwnd=32；RTT10-20 拥塞避免 +1/RTT → …→43
    const r = execTemplate("cn-tcp-congestion");
    const texts = allEventText(r);
    expect(texts.some((t) => t.includes("RTT 1: 慢启动 cwnd 1 → 2"))).toBe(true);
    expect(texts.some((t) => t.includes("RTT 6: 慢启动 cwnd 32 → 64"))).toBe(true);
    expect(texts.some((t) => t.includes("RTT 7: 拥塞避免 cwnd 64 → 65"))).toBe(true);
    expect(
      texts.some((t) => t.includes("ssthresh = 32") && t.includes("快恢复 cwnd = 35")),
    ).toBe(true);
    expect(texts.some((t) => t.includes("RTT 20: 拥塞避免 cwnd 42 → 43"))).toBe(true);
  });
});

// 元测试：清单完整性（23 个模板都在 templates.ts 里且 code 非空）
describe("模板清单完整性", () => {
  it("23 个模板 id 全部存在且 code 非空", () => {
    for (const id of CO_CN_IDS) {
      const tpl = getTemplateById(id);
      expect(tpl, `模板 ${id} 存在`).toBeDefined();
      expect(tpl!.code.trim().length, `模板 ${id} code 非空`).toBeGreaterThan(0);
    }
  });
});
