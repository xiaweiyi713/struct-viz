/**
 * 操作系统 20 个模板逐个验证（verify-os）。
 *
 * 方法：从 src/data/templates.ts 取出每个模板的精确 code 字符串，
 * 经 parse(code) 解析、createRuntime().execute(program) 执行，
 * 对照操作系统算法定义断言结果。所有期望值均为独立手算，
 * 手算过程见各 it 上方的注释。
 *
 * 约束：本文件只做验证，不修改任何源码。发现疑似 bug 只如实记录。
 */
import { describe, it, expect } from "vitest";
import { parse } from "../parser/parser";
import { createRuntime } from "../executor";
import { templates } from "../../data/templates";

type ExecResult = ReturnType<ReturnType<typeof createRuntime>["execute"]>;

const OS_IDS = [
  "os-fcfs",
  "os-sjf",
  "os-rr",
  "os-fifo",
  "os-lru",
  "os-opt",
  "os-banker",
  "os-first-fit",
  "os-best-fit",
  "os-worst-fit",
  "os-disk-fcfs",
  "os-disk-scan",
  "os-disk-cscan",
  "os-producer-consumer",
  "os-priority",
  "os-clock",
  "os-readers-writers",
  "os-dining",
  "os-deadlock-detect",
  "os-paging",
] as const;

function templateCode(id: string): { code: string; name: string } {
  const t = templates.find((x) => x.id === id);
  if (!t) throw new Error(`模板 ${id} 不存在`);
  return { code: t.code, name: t.name };
}

/** 解析 + 执行，断言无错误且有帧 */
function runTemplate(id: string): { r: ExecResult; name: string } {
  const { code, name } = templateCode(id);
  const parsed = parse(code);
  expect(parsed.errors, `${id}(${name}) parse 不应有错误`).toHaveLength(0);
  const r = createRuntime().execute(parsed.program!);
  expect(r.errors, `${id}(${name}) execute 不应有运行时错误`).toHaveLength(0);
  expect(r.frames.length, `${id}(${name}) 应产生 trace 帧`).toBeGreaterThan(0);
  return { r, name };
}

function lastFrame(r: ExecResult) {
  return r.frames[r.frames.length - 1];
}

/** 取某实例的变量 display 值（key 形如 "ps.P0_等待"） */
function varsOf(r: ExecResult, instance: string): Record<string, string> {
  const out: Record<string, string> = {};
  const vars = lastFrame(r).snapshot.variables ?? {};
  for (const [k, v] of Object.entries(vars)) {
    if (k.startsWith(`${instance}.`)) out[k.slice(instance.length + 1)] = v.display;
  }
  return out;
}

/** 取 multiarray 快照每行的 value 字符串 */
function multiarrayOf(r: ExecResult, instance: string): string[][] {
  const s = lastFrame(r).snapshot.structures[instance];
  if (!s || s.type !== "multiarray")
    throw new Error(`实例 ${instance} 不是 multiarray`);
  return (s as { arrays: { value: unknown }[][] }).arrays.map((row) =>
    row.map((cell) => String(cell.value)),
  );
}

/** 取 array 快照的 value 字符串 */
function arrayOf(r: ExecResult, instance: string): string[] {
  const s = lastFrame(r).snapshot.structures[instance];
  if (!s || s.type !== "array") throw new Error(`实例 ${instance} 不是 array`);
  return (s as { items: { value: unknown }[] }).items.map((x) => String(x.value));
}

describe("OS 模板验证", () => {
  it("模板清单完整：20 个 os 模板都在 templates.ts 中", () => {
    for (const id of OS_IDS) {
      expect(
        templates.some((t) => t.id === id),
        `缺失模板 ${id}`,
      ).toBe(true);
    }
  });

  // ── 进程调度 ──
  // os-fcfs: P0(0,5) P1(1,3) P2(2,8) P3(3,6)，按到达序：
  // P0[0-5] w0 t5；P1[5-8] w4 t7；P2[8-16] w6 t14；P3[16-22] w13 t19
  it("os-fcfs 先来先服务：完成顺序与等待/周转时间", () => {
    const { r } = runTemplate("os-fcfs");
    expect(multiarrayOf(r, "ps")[0]).toEqual([
      "P0:[0-5]",
      "P1:[5-8]",
      "P2:[8-16]",
      "P3:[16-22]",
    ]);
    const v = varsOf(r, "ps");
    expect([v["P0_等待"], v["P1_等待"], v["P2_等待"], v["P3_等待"]]).toEqual([
      "0",
      "4",
      "6",
      "13",
    ]);
    expect([v["P0_周转"], v["P1_周转"], v["P2_周转"], v["P3_周转"]]).toEqual([
      "5",
      "7",
      "14",
      "19",
    ]);
  });

  // os-sjf: P0(0,7) P1(2,4) P2(4,1) P3(5,4)，非抢占：
  // t0 只有 P0 →[0-7]；t7 时 P1(4),P2(1),P3(4)，最短 P2 →[7-8]；
  // t8 时 P1,P3 突发同为 4，按实现取先遇到的 P1 →[8-12]；t12 P3 →[12-16]
  // 等待: P0=0,P1=6,P2=3,P3=7；周转: P0=7,P1=10,P2=4,P3=11
  it("os-sjf 短作业优先：最短者先行，突发相同取先到达者", () => {
    const { r } = runTemplate("os-sjf");
    expect(multiarrayOf(r, "ps")[0]).toEqual([
      "P0:[0-7]",
      "P2:[7-8]",
      "P1:[8-12]",
      "P3:[12-16]",
    ]);
    const v = varsOf(r, "ps");
    expect([v["P0_等待"], v["P1_等待"], v["P2_等待"], v["P3_等待"]]).toEqual([
      "0",
      "6",
      "3",
      "7",
    ]);
    expect([v["P0_周转"], v["P1_周转"], v["P2_周转"], v["P3_周转"]]).toEqual([
      "7",
      "10",
      "4",
      "11",
    ]);
  });

  // os-rr: P0(0,5) P1(1,3) P2(2,8) P3(3,6)，q=2。手算轮转：
  // [0-2]P0 [2-4]P1 [4-6]P2 [6-8]P0 [8-10]P3 [10-11]P1(完) [11-13]P2
  // [13-14]P0(完) [14-16]P3 [16-18]P2 [18-20]P3(完) [20-22]P2(完)
  // 完成顺序 P1@11,P0@14,P3@20,P2@22；等待 9,7,12,11；周转 14,10,20,17
  it("os-rr 时间片轮转：切片序列与完成顺序", () => {
    const { r } = runTemplate("os-rr");
    expect(multiarrayOf(r, "ps")[0]).toEqual([
      "P0:[0-2]",
      "P1:[2-4]",
      "P2:[4-6]",
      "P0:[6-8]",
      "P3:[8-10]",
      "P1:[10-11]",
      "P2:[11-13]",
      "P0:[13-14]",
      "P3:[14-16]",
      "P2:[16-18]",
      "P3:[18-20]",
      "P2:[20-22]",
    ]);
    const v = varsOf(r, "ps");
    expect([v["P0_等待"], v["P1_等待"], v["P2_等待"], v["P3_等待"]]).toEqual([
      "9",
      "7",
      "12",
      "11",
    ]);
    expect([v["P0_周转"], v["P1_周转"], v["P2_周转"], v["P3_周转"]]).toEqual([
      "14",
      "10",
      "20",
      "17",
    ]);
  });

  // os-fifo: 帧=3，引用 7,0,1,2,0,3,0,4,2,3。手算：
  // 7缺→[7] 0缺→[7,0] 1缺→[7,0,1] 2缺替7→[2,0,1] 0中 3缺替0→[2,3,1]
  // 0缺替1→[2,3,0] 4缺替2→[4,3,0] 2缺替3→[4,2,0] 3缺替0→[4,2,3]
  // 缺页 9 次、命中 1 次、缺页率 90.0%
  it("os-fifo 页面替换：缺页 9 次命中 1 次", () => {
    const { r } = runTemplate("os-fifo");
    const v = varsOf(r, "pr");
    expect(v["缺页次数"]).toBe("9");
    expect(v["命中次数"]).toBe("1");
    expect(v["缺页率"]).toBe("90.0%");
    expect(multiarrayOf(r, "pr")[0].slice(-1)).toEqual(["4"]);
  });

  // os-lru: 同上输入。手算最近最少使用：
  // 7缺[7] 0缺[7,0] 1缺[7,0,1] 2缺替最久未用7→[2,0,1] 0中
  // 3缺替最久未用1→[2,0,3] 0中 4缺替最久未用2→[4,0,3]
  // 2缺替最久未用3→[4,0,2] 3缺替最久未用0→[4,3,2]
  // 缺页 8 次、命中 2 次、缺页率 80.0%
  it("os-lru 页面替换：缺页 8 次命中 2 次", () => {
    const { r } = runTemplate("os-lru");
    const v = varsOf(r, "pr");
    expect(v["缺页次数"]).toBe("8");
    expect(v["命中次数"]).toBe("2");
    expect(v["缺页率"]).toBe("80.0%");
  });

  // os-opt: 同上输入。手算未来最远：
  // 7,0,1 依次缺页装入；2缺：7永不再用(与1并列最远，取先遇到的帧0)→替7；
  // 0中；3缺：1永不再用→替1；0中；4缺：0永不再用→替0；2中；3中
  // 缺页 6 次、命中 4 次、缺页率 60.0%
  it("os-opt 页面替换：缺页 6 次命中 4 次", () => {
    const { r } = runTemplate("os-opt");
    const v = varsOf(r, "pr");
    expect(v["缺页次数"]).toBe("6");
    expect(v["命中次数"]).toBe("4");
    expect(v["缺页率"]).toBe("60.0%");
  });

  // os-banker: Available=[10,5,7]
  // P0 Max[7,5,3] Alloc[0,1,0] Need[7,4,3]
  // P1 Max[3,2,2] Alloc[2,0,0] Need[1,2,2]
  // P2 Max[9,0,2] Alloc[3,0,2] Need[6,0,0]
  // P3 Max[2,2,2] Alloc[2,1,1] Need[0,1,1]
  // P1 请求[1,0,2]：≤Need[1,2,2] ✓，≤Available ✓
  // 试分配后 Available=[9,5,5]，安全性检查：
  // Work=[9,5,5]→P0([7,4,3]可)→[9,6,5]→P1([0,2,0]可)→[12,6,7]
  // →P2([6,0,0]可)→[15,6,9]→P3([0,1,1]可)→安全
  // 安全序列 P0->P1->P2->P3，请求成功分配
  it("os-banker 银行家算法：请求合法且安全，安全序列正确", () => {
    const { r } = runTemplate("os-banker");
    const v = varsOf(r, "bk");
    expect(v["可用资源"]).toBe("[9, 5, 5]");
    expect(v["安全序列"]).toBe("P0 -> P1 -> P2 -> P3");
    expect(v["最近操作"]).toContain("成功分配");
  });

  // os-first-fit: 总 640，请求 212,417,112,426（单空闲块切分）：
  // R1=212→[+212,-428]；R2=417→[+212,+417,-11]；
  // R3=112 无空闲块≥112→失败；R4=426→失败
  // 已用 629，空闲 11，利用率 629/640=98.3%
  it("os-first-fit 首次适应：分配结果与失败请求", () => {
    const { r } = runTemplate("os-first-fit");
    expect(multiarrayOf(r, "ma")[0]).toEqual(["212", "417", "-11"]);
    const v = varsOf(r, "ma");
    expect(v["已用"]).toBe("629");
    expect(v["空闲"]).toBe("11");
    expect(v["利用率"]).toBe("98.3%");
  });

  // os-best-fit: 同上输入。R1 后唯一空闲块 428，R2 选最小可容纳块=428，
  // 结果与 first-fit 相同：[+212,+417,-11]，R3/R4 失败
  it("os-best-fit 最佳适应：选择最小可容纳块", () => {
    const { r } = runTemplate("os-best-fit");
    expect(multiarrayOf(r, "ma")[0]).toEqual(["212", "417", "-11"]);
    const v = varsOf(r, "ma");
    expect(v["已用"]).toBe("629");
    expect(v["空闲"]).toBe("11");
  });

  // os-worst-fit: 总 640，请求 130,60,100,200,140,80,70：
  // 每次选最大空闲块：130→[+130,-510]；60→[+130,+60,-450]；
  // 100→[+130,+60,+100,-350]；200→[+130,+60,+100,+200,-150]；
  // 140→[+130,+60,+100,+200,+140,-10]；80/70 无块可容纳→失败
  // 已用 630，空闲 10
  it("os-worst-fit 最坏适应：每次选最大空闲块", () => {
    const { r } = runTemplate("os-worst-fit");
    expect(multiarrayOf(r, "ma")[0]).toEqual([
      "130",
      "60",
      "100",
      "200",
      "140",
      "-10",
    ]);
    const v = varsOf(r, "ma");
    expect(v["已用"]).toBe("630");
    expect(v["空闲"]).toBe("10");
    expect(v["利用率"]).toBe("98.4%");
  });

  // os-disk-fcfs: 磁头 53，请求 98,183,37,122,14,124,65,67（教材经典序列）：
  // 寻道 45+85+146+85+108+110+59+2=640；平均 640/9=71.11
  it("os-disk-fcfs 磁盘调度：按请求顺序，总寻道 640", () => {
    const { r } = runTemplate("os-disk-fcfs");
    expect(arrayOf(r, "ds")).toEqual([
      "53",
      "98",
      "183",
      "37",
      "122",
      "14",
      "124",
      "65",
      "67",
    ]);
    const v = varsOf(r, "ds");
    expect(v["总寻道距离"]).toBe("640");
    expect(v["平均寻道"]).toBe("71.11");
  });

  // os-disk-scan: 磁头 53，maxTrack=199，方向向外(1)，请求 98,183,37,122,14,124,65,67。
  // SCAN（电梯算法）定义：磁头沿一个方向移动到磁盘末端，服务沿途请求，然后反向。
  // 右侧(≥53)升序：65,67,98,122,124,183；左侧：14,37。
  // 53→65(12)→67(2)→98(31)→122(24)→124(2)→183(59)→199(16)→37(162)→14(23)
  // 总寻道 12+2+31+24+2+59+16+162+23=331；平均 331/10=33.10。
  // 注意区别于 LOOK（在最远请求 183 处直接折返，总寻道 299）——408 明确区分两者。
  it("os-disk-scan 磁盘调度：SCAN 到达磁盘末端再折返，总寻道 331", () => {
    const { r } = runTemplate("os-disk-scan");
    expect(arrayOf(r, "ds")).toEqual([
      "53",
      "65",
      "67",
      "98",
      "122",
      "124",
      "183",
      "199",
      "37",
      "14",
    ]);
    const v = varsOf(r, "ds");
    expect(v["总寻道距离"]).toBe("331");
    expect(v["平均寻道"]).toBe("33.10");
  });

  // os-disk-cscan: 磁头 53，maxTrack=199，请求 98,183,37,122,14,124,65,67：
  // 右侧(≥53)升序：65,67,98,122,124,183；左侧：14,37
  // 53→65(12)→67(2)→98(31)→122(24)→124(2)→183(59)→199(16)→跳0(199)→14(14)→37(23)
  // 总寻道 12+2+31+24+2+59+16+199+14+23=382；平均 382/10=38.20
  it("os-disk-cscan 磁盘调度：经末端循环，总寻道 382", () => {
    const { r } = runTemplate("os-disk-cscan");
    expect(arrayOf(r, "ds")).toEqual([
      "53",
      "65",
      "67",
      "98",
      "122",
      "124",
      "183",
      "199",
      "0",
      "14",
      "37",
    ]);
    const v = varsOf(r, "ds");
    expect(v["总寻道距离"]).toBe("382");
    expect(v["平均寻道"]).toBe("38.20");
  });

  // os-producer-consumer: 缓冲 5；produce 10,20,30 → [10,20,30]；
  // consume → 取 10；produce 40 → 空槽0 → [40,20,30]；
  // consume → 取 40；consume → 取 20。终态 [-, -, 30, -, -]，
  // mutex=1 empty=4 full=1，使用 1/5
  it("os-producer-consumer：FIFO 消费，信号量一致", () => {
    const { r } = runTemplate("os-producer-consumer");
    const rows = multiarrayOf(r, "pc");
    expect(rows[0]).toEqual(["-", "-", "30", "-", "-"]);
    expect(rows[1]).toEqual(["mutex=1", "empty=4", "full=1"]);
    const v = varsOf(r, "pc");
    expect(v["mutex"]).toBe("1");
    expect(v["empty"]).toBe("4");
    expect(v["full"]).toBe("1");
    expect(v["缓冲区使用"]).toBe("1/5");
    const titles = r.frames.map((f) => f.event.title);
    expect(
      titles.filter((t) => t.startsWith("消费者: 消费")),
    ).toEqual(["消费者: 消费 10", "消费者: 消费 40", "消费者: 消费 20"]);
  });

  // os-priority: 三元组(到达,突发,优先级)，数字越小优先级越高，非抢占：
  // P0(0,5,p2) P1(1,3,p1) P2(2,8,p3) P3(3,6,p2)
  // t0: P0 →[0-5]；t5: P1(p1)最高 →[5-8]；t8: P3(p2)优于P2(p3) →[8-14]；
  // t14: P2 →[14-22]
  // 等待: P0=0,P1=4,P2=12,P3=5；周转: P0=5,P1=7,P2=20,P3=11
  it("os-priority 优先级调度：按优先级（数字小优先）调度", () => {
    const { r } = runTemplate("os-priority");
    expect(multiarrayOf(r, "ps")[0]).toEqual([
      "P0:[0-5]",
      "P1:[5-8]",
      "P3:[8-14]",
      "P2:[14-22]",
    ]);
    const v = varsOf(r, "ps");
    expect([v["P0_等待"], v["P1_等待"], v["P2_等待"], v["P3_等待"]]).toEqual([
      "0",
      "4",
      "12",
      "5",
    ]);
    expect([v["P0_周转"], v["P1_周转"], v["P2_周转"], v["P3_周转"]]).toEqual([
      "5",
      "7",
      "20",
      "11",
    ]);
  });

  // os-clock: 帧=3，引用 7,0,1,2,0,3,0,4,2,3。手算时钟指针：
  // 7缺→f0,ref[1,0,0],p1；0缺→f1,ref[1,1,0],p2；1缺→f2,ref[1,1,1],p0；
  // 2缺：清f0,f1,f2→替f0,ref[1,0,0],p1；0中→ref[1,1,0]；
  // 3缺：p1 ref1→清,p2；ref[2]=0→替f2,ref[1,0,1],p0；0中→ref[1,1,1]；
  // 4缺：清f0,f1,f2→替f0,ref[1,0,0],p1；2缺：p1 ref0→替f1,ref[1,1,0],p2；
  // 3中→ref[1,1,1]
  // 缺页 7 次、命中 3 次、缺页率 70.0%，终态帧 [4,2,3]，指针 2
  it("os-clock 页面替换：缺页 7 次，第二次机会语义正确", () => {
    const { r } = runTemplate("os-clock");
    const v = varsOf(r, "cr");
    expect(v["缺页次数"]).toBe("7");
    expect(v["命中次数"]).toBe("3");
    expect(v["缺页率"]).toBe("70.0%");
    expect(v["指针位置"]).toBe("2");
    expect(multiarrayOf(r, "cr")[0]).toEqual(["4", "2", "3"]);
  });

  // os-readers-writers: 调用串行执行（读者优先模型）：
  // R1 读→写缓冲"R1读"；R2 读→"R2读"；W1 写→"W1写"；
  // R3 读→"R3读"；W2 写→"W2写"。终态信号量全部复位，
  // readcount=0 writecount=0 rw_mutex=1 mutex=1，无活跃读者/写者
  it("os-readers-writers：读写串行正确，信号量复位", () => {
    const { r } = runTemplate("os-readers-writers");
    const rows = multiarrayOf(r, "rw");
    expect(rows[0]).toEqual(["R1读", "R2读", "W1写", "R3读", "W2写"]);
    const v = varsOf(r, "rw");
    expect(v["readcount"]).toBe("0");
    expect(v["writecount"]).toBe("0");
    expect(v["rw_mutex"]).toBe("1");
    expect(v["mutex"]).toBe("1");
    expect(v["活跃读者"]).toBe("无");
    expect(v["活跃写者"]).toBe("无");
  });

  // os-dining: 5 哲学家，奇偶策略（偶数先拿右筷）：
  // think(0)；eat(0)：先右叉1再左叉0→就餐，筷[1,1,0,0,0]；
  // think(2)；eat(2)：先右叉3再左叉2→就餐，筷[1,1,1,1,0]；
  // eat(4)：先右叉0，被 P0 占用→饥饿等待
  // 终态：P0,P2 就餐；P4 饥饿；就餐中=2
  it("os-dining 哲学家就餐：奇偶策略下 P4 因筷子被占而饥饿", () => {
    const { r } = runTemplate("os-dining");
    const rows = multiarrayOf(r, "dp");
    expect(rows[0]).toEqual([
      "P0:就餐",
      "P1:思考",
      "P2:就餐",
      "P3:思考",
      "P4:饥饿",
    ]);
    expect(rows[1]).toEqual([
      "叉0:被占",
      "叉1:被占",
      "叉2:被占",
      "叉3:被占",
      "叉4:可用",
    ]);
    expect(varsOf(r, "dp")["就餐中"]).toBe("2");
  });

  // os-deadlock-detect: Alloc: P0[1,2,0] P1[0,1,2] P2[1,0,0]；
  // Request: P0[0,0,1] P1[2,0,0] P2[0,1,0]；Available=[0,0,0]
  // （实现假设总资源=已分配之和，故可用为 0）
  // 检测：无人请求≤[0,0,0]→全部死锁。且确实存在循环等待：
  // P0 等 R2(P1 持有)，P1 等 R0(P0/P2 持有)，P2 等 R1(P0/P1 持有)
  it("os-deadlock-detect 死锁检测：P0/P1/P2 均死锁", () => {
    const { r } = runTemplate("os-deadlock-detect");
    expect(varsOf(r, "dd")["死锁进程"]).toBe("P0, P1, P2");
  });

  // os-paging: 逻辑地址 8192，页大小 4096，页表 [2,5,8,3,7]：
  // 页号 = 8192/4096 = 2，偏移 = 0，页2→框8，
  // 物理地址 = 8×4096+0 = 32768
  it("os-paging 分页地址转换：物理地址 32768", () => {
    const { r } = runTemplate("os-paging");
    const v = varsOf(r, "pg");
    expect(v["逻辑地址"]).toBe("8192");
    expect(v["页号"]).toBe("2");
    expect(v["页内偏移"]).toBe("0");
    expect(v["物理地址"]).toBe("32768");
  });
});
