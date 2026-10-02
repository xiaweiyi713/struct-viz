/**
 * 数据结构-线性/排序/查找/哈希/串 25 个模板的逐个验证。
 *
 * 方法：取 src/data/templates.ts 中每个模板的精确 code 字符串，
 * 经 parse → createRuntime().execute（与线上 Worker 同一管线）执行，
 * 再从末帧 snapshot / variables / trace 提取结果，与算法定义独立推导的期望对照。
 *
 * 约定：期望一律从算法教科书定义手算/程序独立推导，不照抄 runtime 实现逻辑。
 * 2026-10-02：hashtable-delete 的懒惰删除 bug（linearSearch 抹掉 deleted 标记）
 * 已在 src/core/algorithms/hashtable.ts 修复，本文件对应 it.fails 已转正为普通 it。
 */
import { describe, it, expect } from "vitest";
import { parse } from "../parser/parser";
import { createRuntime } from "../executor";
import { getTemplateById } from "../../data/templates";
import type {
  VisualArrayItem,
  VisualStructure,
  VisualTreeNode,
  VisualHashBucket,
} from "../../types/trace";

type ExecResult = ReturnType<ReturnType<typeof createRuntime>["execute"]>;

/** 运行指定模板的精确 code：parse 无错、执行无错、必须产生有效帧 */
function execTemplate(id: string): ExecResult {
  const t = getTemplateById(id);
  expect(t, `template ${id} exists`).toBeDefined();
  const pr = parse(t!.code);
  expect(pr.errors, `${id}: parse errors`).toHaveLength(0);
  const r = createRuntime().execute(pr.program!);
  expect(r.errors, `${id}: runtime errors`).toHaveLength(0);
  expect(r.frames.length, `${id}: frames`).toBeGreaterThan(0);
  return r;
}

function lastFrame(r: ExecResult) {
  return r.frames[r.frames.length - 1];
}

function structOf(r: ExecResult, name: string): VisualStructure {
  const s = lastFrame(r).snapshot.structures[name];
  expect(s, `structure ${name} exists`).toBeDefined();
  return s!;
}

function numVar(r: ExecResult, key: string): number {
  const v = lastFrame(r).snapshot.variables?.[key] as { value: unknown } | undefined;
  expect(v, `variable ${key} exists`).toBeDefined();
  return Number(v!.value);
}

function linearItems(r: ExecResult, name: string): (number | string)[] {
  const s = structOf(r, name) as { type: string; items: VisualArrayItem[] };
  expect(["array", "stack", "queue"]).toContain(s.type);
  return s.items.map((i) => i.value);
}

function multiArrays(r: ExecResult, name: string): {
  labels: string[];
  arrays: (number | string)[][];
} {
  const s = structOf(r, name) as {
    type: string;
    labels: string[];
    arrays: VisualArrayItem[][];
  };
  expect(s.type).toBe("multiarray");
  return { labels: s.labels, arrays: s.arrays.map((a) => a.map((i) => i.value)) };
}

function hashBuckets(r: ExecResult, name: string): VisualHashBucket[] {
  const s = structOf(r, name) as { type: string; buckets: VisualHashBucket[] };
  expect(s.type).toBe("hashtable");
  return s.buckets;
}

function treeNodes(r: ExecResult, name: string): Record<string, VisualTreeNode> {
  const s = structOf(r, name) as {
    type: string;
    nodes: Record<string, VisualTreeNode>;
  };
  expect(s.type).toBe("tree");
  return s.nodes;
}

/** 断言数组是输入的排序后排列（既验证有序，也验证是原输入的排列） */
function expectSortedPermutation(r: ExecResult, name: string, input: number[]) {
  const vals = linearItems(r, name).map(Number);
  expect(vals).toEqual([...input].sort((a, b) => a - b));
}

// ─── 栈 / 队列 ───

describe("stack-basic 栈操作", () => {
  it("push 1,2,3 → pop → peek：LIFO，结果为 [1,2]，栈顶 2", () => {
    const r = execTemplate("stack-basic");
    // 定义：栈是后进先出；push 1,2,3 后 pop 弹出 3，peek 看到 2
    expect(linearItems(r, "s").map(Number)).toEqual([1, 2]);
    expect(numVar(r, "s.size")).toBe(2);
    expect(numVar(r, "s.top")).toBe(2);
  });
});

describe("queue-basic 队列操作", () => {
  it("enqueue 1,2,3,4 → dequeue → front：FIFO，结果为 [2,3,4]", () => {
    const r = execTemplate("queue-basic");
    // 定义：队列是先进先出；dequeue 移除队头 1，front 看到 2
    expect(linearItems(r, "q").map(Number)).toEqual([2, 3, 4]);
    expect(numVar(r, "q.size")).toBe(3);
    expect(numVar(r, "q.front")).toBe(2);
    expect(numVar(r, "q.rear")).toBe(4);
  });
});

// ─── 排序（比较类）───

describe("quicksort 快速排序", () => {
  it("sort(38,27,43,3,9,82,10) → 有序排列", () => {
    expectSortedPermutation(execTemplate("quicksort"), "q", [38, 27, 43, 3, 9, 82, 10]);
  });
  it("含重复元素仍正确", () => {
    const pr = parse(`QuickSort q;\nq.sort(5, 3, 5, 1, 3);`);
    expect(pr.errors).toHaveLength(0);
    const r = createRuntime().execute(pr.program!);
    expect(r.errors).toHaveLength(0);
    expect(linearItems(r, "q").map(Number)).toEqual([1, 3, 3, 5, 5]);
  });
});

describe("heapsort 堆排序", () => {
  it("sort(38,27,43,3,9,82,10) → 有序排列", () => {
    expectSortedPermutation(execTemplate("heapsort"), "h", [38, 27, 43, 3, 9, 82, 10]);
  });
});

describe("mergesort 归并排序", () => {
  it("sort(38,27,43,3,9,82,10) → 有序排列", () => {
    expectSortedPermutation(execTemplate("mergesort"), "m", [38, 27, 43, 3, 9, 82, 10]);
  });
});

describe("bubblesort 冒泡排序", () => {
  it("sort(38,27,43,3,9,82,10) → 有序排列", () => {
    expectSortedPermutation(execTemplate("bubblesort"), "b", [38, 27, 43, 3, 9, 82, 10]);
  });
});

describe("insertionsort 插入排序", () => {
  it("sort(38,27,43,3,9,82,10) → 有序排列", () => {
    expectSortedPermutation(execTemplate("insertionsort"), "is", [38, 27, 43, 3, 9, 82, 10]);
  });
});

describe("selectionsort 选择排序", () => {
  it("sort(64,25,12,22,11,90,45) → 有序排列", () => {
    expectSortedPermutation(execTemplate("selectionsort"), "s", [64, 25, 12, 22, 11, 90, 45]);
  });
});

describe("shellsort 希尔排序", () => {
  it("sort(64,25,12,22,11,90,45,38,72,56) → 有序排列", () => {
    const r = execTemplate("shellsort");
    expectSortedPermutation(r, "s", [64, 25, 12, 22, 11, 90, 45, 38, 72, 56]);
    expect(numVar(r, "s.length")).toBe(10);
  });
});

// ─── 排序（非比较类）───

describe("countingsort 计数排序", () => {
  it("sort(4,2,2,8,3,3,1)：输出有序；计数数组为各值的起始下标", () => {
    const r = execTemplate("countingsort");
    const { labels, arrays } = multiArrays(r, "s");
    expect(labels).toEqual(["输入数组", "计数数组", "输出数组"]);
    const input = [4, 2, 2, 8, 3, 3, 1];
    // 输出数组必须是输入的排序后排列
    expect(arrays[2].map(Number)).toEqual([1, 2, 2, 3, 3, 4, 8]);
    // 定义（起始下标变体）：count[i] = 输入中严格小于 i 的元素个数
    const max = Math.max(...input);
    const expectedCount = Array.from(
      { length: max + 1 },
      (_, i) => input.filter((x) => x < i).length,
    );
    expect(arrays[1].map(Number)).toEqual(expectedCount);
  });
});

describe("radixsort 基数排序", () => {
  it("sort(170,45,75,90,802,24,2,66) → 有序排列", () => {
    const r = execTemplate("radixsort");
    const { arrays } = multiArrays(r, "s");
    // 第 0 个数组为排序数组
    expect(arrays[0].map(Number)).toEqual([2, 24, 45, 66, 75, 90, 170, 802]);
  });
});

describe("bucket-sort 桶排序", () => {
  it("sort(29,25,3,49,9,37,21,43)：输出有序；桶内各自有序；桶并集为输入多重集", () => {
    const r = execTemplate("bucket-sort");
    const { labels, arrays } = multiArrays(r, "bs");
    expect(labels).toEqual(["输入数组", "桶 0", "桶 1", "桶 2", "输出数组"]);
    const input = [29, 25, 3, 49, 9, 37, 21, 43];
    const sorted = [...input].sort((a, b) => a - b);
    const buckets = arrays.slice(1, 4).map((b) => b.map(Number));
    const output = arrays[4].map(Number);
    // 定义：桶内排序后顺序收集 → 输出有序
    expect(output).toEqual(sorted);
    // 定义：每个桶内部有序
    for (const b of buckets) {
      expect([...b].sort((a, b2) => a - b2)).toEqual(b);
    }
    // 定义：桶的并集恰为输入多重集（无丢失、无新增）
    expect(buckets.flat().sort((a, b) => a - b)).toEqual(sorted);
  });
});

// ─── 查找 ───

describe("binarysearch 折半查找", () => {
  it("在 [1,3,...,19] 中找 7 → 位置 3", () => {
    const r = execTemplate("binarysearch");
    // 定义：7 在 0-based 数组 [1,3,5,7,9,11,13,15,17,19] 中的下标是 3
    expect(linearItems(r, "bs").map(Number)).toEqual([1, 3, 5, 7, 9, 11, 13, 15, 17, 19]);
    const final = r.frames
      .map((f) => f.event)
      .find((e) => e.type === "MARK_FINAL" && e.title.includes("找到"));
    expect(final, "found event exists").toBeDefined();
    expect((final!.payload as { found: boolean; index: number }).found).toBe(true);
    expect((final!.payload as { found: boolean; index: number }).index).toBe(3);
  });
  it("查找不存在的值 8 → 报告不在表中", () => {
    const pr = parse(`BinarySearch bs;\nbs.search(1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 8);`);
    expect(pr.errors).toHaveLength(0);
    const r = createRuntime().execute(pr.program!);
    expect(r.errors).toHaveLength(0);
    const miss = r.frames
      .map((f) => f.event)
      .find((e) => e.title.includes("未找到 8"));
    expect(miss, "miss event exists").toBeDefined();
  });
});

// ─── 哈希表 ───

describe("hashtable-linear 哈希表（线性探测）", () => {
  it("插入 47,25,36,14,58,69：key%11 线性探测落位正确；search(36) 命中、search(37) 未命中", () => {
    const r = execTemplate("hashtable-linear");
    const buckets = hashBuckets(r, "ht");
    // 定义：h = key % 11；47%11=3，25%11=3→冲突→4，36%11=3→5，14%11=3→6，58%11=3→7，69%11=3→8
    const expected: Record<number, number> = { 3: 47, 4: 25, 5: 36, 6: 14, 7: 58, 8: 69 };
    for (const b of buckets) {
      if (expected[b.index] !== undefined) {
        expect(b.entries.map((e) => e.key)).toEqual([expected[b.index]]);
      } else {
        expect(b.entries).toHaveLength(0);
      }
    }
    expect(numVar(r, "ht.elements")).toBe(6);
    expect(numVar(r, "ht.tableSize")).toBe(11);
    // search(36) 命中
    const hit = r.frames
      .map((f) => f.event)
      .find((e) => e.title.includes("找到 36"));
    expect(hit, "search(36) hit event").toBeDefined();
    // search(37)：37%11=4，探测 4(25),5(36),6(14),7(58),8(69),9(空) → 未命中
    const miss = r.frames
      .map((f) => f.event)
      .find((e) => e.title.includes("37 不在"));
    expect(miss, "search(37) miss event").toBeDefined();
  });
});

describe("hashtable-chain 哈希表（链地址法）", () => {
  it("插入后 search(36) 命中、delete(25) 后各桶内容正确", () => {
    const r = execTemplate("hashtable-chain");
    const buckets = hashBuckets(r, "ht");
    // 定义：h = key % 7；47%7=5，25%7=4，36%7=1，14%7=0，58%7=2，69%7=6；删除 25 后桶 4 为空
    const expected: Record<number, number[]> = {
      0: [14], 1: [36], 2: [58], 3: [], 4: [], 5: [47], 6: [69],
    };
    for (const b of buckets) {
      expect(b.entries.map((e) => e.key).sort((a, b2) => a - b2)).toEqual(expected[b.index]);
    }
    expect(numVar(r, "ht.elements")).toBe(5);
    const hit = r.frames
      .map((f) => f.event)
      .find((e) => e.title.includes("找到 36"));
    expect(hit, "search(36) hit event").toBeDefined();
  });
});

describe("hashtable-delete 哈希表删除（线性探测懒惰删除）", () => {
  it("delete(25) 后 search(25) 正确未命中（探测越过 deleted 槽）", () => {
    const r = execTemplate("hashtable-delete");
    const miss = r.frames
      .map((f) => f.event)
      .find((e) => e.title.includes("25 不在"));
    expect(miss, "search(25) after delete misses").toBeDefined();
  });

  // 回归测试（2026-10-02 修复）：linearSearch 探测时曾把 entry.status 置为 "active"，
  // 把 deleted 标记抹掉，导致随后的 insert(25) 误判为"键已存在"而成为 no-op，
  // 最终桶里有 5 个 live 键但 ht.elements 只计 4。修复后 search 为只读，不断言翻转。
  it("delete→search→re-insert 后 ht.elements 应等于实际 live 键数 5", () => {
    const r = execTemplate("hashtable-delete");
    const buckets = hashBuckets(r, "ht");
    const liveKeys = buckets
      .flatMap((b) => b.entries)
      .filter((e) => e.status !== "deleted")
      .map((e) => e.key)
      .sort((a, b) => a - b);
    // 定义：5 次 insert − 1 次 delete + 1 次复用插入 = 5 个 live 键
    expect(liveKeys).toEqual([14, 25, 36, 47, 58]);
    expect(numVar(r, "ht.elements")).toBe(liveKeys.length);
  });
});

// ─── 串 ───

describe("kmp KMP 模式匹配", () => {
  it('match("ababcabcacbab","abcac") → 在位置 5 匹配；next=[-1,0,0,0,1]', () => {
    const r = execTemplate("kmp");
    // 独立手算：text[5..9]="abcac"=pattern，且 0..4 均无匹配 → 首次匹配位置 5
    const done = r.frames
      .map((f) => f.event)
      .find((e) => e.type === "MARK_FINAL" && e.title.includes("匹配成功"));
    expect(done, "match success event").toBeDefined();
    expect(done!.title).toContain("位置 5");
    // 定义（-1 约定）：next[0]=-1；"a"→0，"ab"→0，"abc"→0，"abca"→1
    const s = structOf(r, "k") as { type: string; nextArray: number[] };
    expect(s.type).toBe("string");
    expect(s.nextArray).toEqual([-1, 0, 0, 0, 1]);
    // 匹配结束时 i=5+5=10，j=5=pattern 长度
    expect(numVar(r, "k.i")).toBe(10);
    expect(numVar(r, "k.j")).toBe(5);
  });
});

describe("naivestr 朴素模式匹配", () => {
  it('match("ababcabcacbab","abcac") → 在位置 5 匹配', () => {
    const r = execTemplate("naivestr");
    // 与 KMP 同一输入，朴素算法也应报告首次匹配位置 5（定义相同）
    const done = r.frames
      .map((f) => f.event)
      .find((e) => e.type === "MARK_FINAL" && e.title.includes("匹配成功"));
    expect(done, "match success event").toBeDefined();
    expect(done!.title).toContain("位置 5");
  });
});

describe("string-hash 字符串哈希", () => {
  it('hash("abcabcabc",1,3,4,6,7,9)：前缀哈希/幂次/子串查询均符合多项式滚动哈希定义', () => {
    const r = execTemplate("string-hash");
    const base = numVar(r, "sh.base");
    const mod = numVar(r, "sh.mod");
    const str = "abcabcabc";
    // 定义：H[0]=0，H[i]=(H[i-1]*base+code(s[i-1]))%mod；P[i]=base^i%mod
    const H = [0];
    for (const ch of str) H.push((H[H.length - 1] * base + ch.charCodeAt(0)) % mod);
    const P = [1];
    for (let i = 0; i < str.length; i++) P.push((P[i] * base) % mod);
    const { labels, arrays } = multiArrays(r, "sh");
    expect(labels).toEqual(["字符", "前缀哈希 H", "幂次 P", "查询结果"]);
    expect(arrays[1].map(Number)).toEqual(H);
    expect(arrays[2].map(Number)).toEqual(P);
    // 定义：子串 [l,r]（1-based 闭区间）哈希 = (H[r]-H[l-1]*P[r-l+1])%mod
    const queries: [number, number][] = [[1, 3], [4, 6], [7, 9]];
    const expected = queries.map(
      ([l, rr]) => (((H[rr] - ((H[l - 1] * P[rr - l + 1]) % mod)) % mod) + mod) % mod,
    );
    expect(arrays[3].map(Number)).toEqual(expected);
    // 定义推论：三个查询子串都是 "abc"，哈希必须相等
    expect(new Set(arrays[3].map(String)).size).toBe(1);
  });
});

// ─── 并查集 / 堆 ───

describe("unionfind 并查集", () => {
  it("init(8)+6 次 union 后：{0,1,2,3} 同集、{4,5,6,7} 同集、两集合互异", () => {
    const r = execTemplate("unionfind");
    const parent = linearItems(r, "uf").map(Number);
    expect(parent).toHaveLength(8);
    // 定义：find(x) = 沿 parent 指针走到 parent[x]==x 的根
    const root = (x: number): number => {
      let cur = x;
      while (parent[cur] !== cur) cur = parent[cur];
      return cur;
    };
    const setA = [0, 1, 2, 3].map(root);
    const setB = [4, 5, 6, 7].map(root);
    expect(new Set(setA).size).toBe(1);
    expect(new Set(setB).size).toBe(1);
    expect(setA[0]).not.toBe(setB[0]);
    expect(numVar(r, "uf.unions")).toBe(6);
    expect(numVar(r, "uf.finds")).toBe(1);
  });
});

describe("ds-uf-compress 并查集路径压缩", () => {
  it("makeset(6)+union 序列后 6 个元素同属一个集合", () => {
    const r = execTemplate("ds-uf-compress");
    const nodes = treeNodes(r, "uf");
    expect(Object.keys(nodes)).toHaveLength(6);
    // 定义：每个元素的根 = 沿 parent 链走到顶；同一集合当且仅当根相同
    const rootOf = (id: string): string => {
      let cur = id;
      while (nodes[cur].parent) cur = nodes[cur].parent!;
      return cur;
    };
    const roots = new Set(Object.keys(nodes).map(rootOf));
    // union(0,1),(2,3),(4,5),(1,3),(3,5) 把 0..5 全部连通
    expect(roots.size).toBe(1);
  });
});

describe("ds-heap-ops 二叉堆操作", () => {
  it("build+insert(0)+extract+insert(2) 后：10 个节点、最小堆性质、top=1", () => {
    const r = execTemplate("ds-heap-ops");
    const nodes = treeNodes(r, "h");
    const ids = Object.keys(nodes);
    // 输入多重集 {9,5,2,7,1,8,3,6,4} +insert 0 +insert 2 −extract(0) = {1,2,2,3,4,5,6,7,8,9}
    expect(ids).toHaveLength(10);
    expect(ids.map((id) => Number(nodes[id].key)).sort((a, b) => a - b)).toEqual([
      1, 2, 2, 3, 4, 5, 6, 7, 8, 9,
    ]);
    // 定义（最小堆）：每个父节点 key ≤ 其子节点 key
    for (const id of ids) {
      const n = nodes[id];
      for (const cid of [n.left, n.right]) {
        if (cid) {
          expect(Number(nodes[cid].key)).toBeGreaterThanOrEqual(Number(n.key));
        }
      }
    }
    expect(numVar(r, "h.size")).toBe(10);
    expect(numVar(r, "h.top")).toBe(1);
  });
});

// ─── 贪心 ───

describe("activity-selection 活动选择", () => {
  const acts: [number, number][] = [
    [1, 4], [3, 5], [0, 6], [5, 7], [3, 9], [5, 9],
    [6, 10], [8, 11], [8, 12], [2, 14], [12, 16],
  ];
  it("选出 4 个互不冲突的活动，且 4 为最优（暴力验证）", () => {
    const r = execTemplate("activity-selection");
    expect(numVar(r, "as.selected")).toBe(4);
    expect(numVar(r, "as.total")).toBe(11);
    const s = structOf(r, "as") as { type: string; items: VisualArrayItem[] };
    const sel = s.items
      .filter((i) => i.status === "highlighted")
      .map((i) => String(i.value).split(":").map(Number) as [number, number]);
    expect(sel).toHaveLength(4);
    // 定义：兼容 = 按结束时间排序后，前一个 finish ≤ 后一个 start
    const ordered = [...sel].sort((a, b) => a[1] - b[1]);
    for (let i = 1; i < ordered.length; i++) {
      expect(ordered[i - 1][1]).toBeLessThanOrEqual(ordered[i][0]);
    }
    // 独立最优性：暴力枚举 2^11 个子集，最大兼容子集为 4
    let best = 0;
    for (let mask = 0; mask < 1 << acts.length; mask++) {
      const sub = acts
        .filter((_, i) => mask & (1 << i))
        .sort((a, b) => a[1] - b[1] || a[0] - b[0]);
      let ok = true;
      for (let i = 1; i < sub.length; i++) {
        if (sub[i - 1][1] > sub[i][0]) { ok = false; break; }
      }
      if (ok) best = Math.max(best, sub.length);
    }
    expect(best).toBe(4);
  });
});

describe("fractional-knapsack 分数背包", () => {
  it("容量 50，物品 (10,60),(20,100),(30,120) → 最大价值 240", () => {
    const r = execTemplate("fractional-knapsack");
    // 定义（贪心最优性定理）：按单位价值 6,5,4 降序装入；
    // 手算：60 + 100 + 120*(20/30) = 240，背包恰装满
    expect(numVar(r, "fk.capacity")).toBe(50);
    expect(numVar(r, "fk.remaining")).toBe(0);
    expect(numVar(r, "fk.totalValue")).toBe(240);
  });
});

describe("job-scheduling 作业调度", () => {
  // [deadline, profit]，下标即作业编号 #0..#4
  const jobs: [number, number][] = [[2, 100], [1, 19], [2, 27], [1, 25], [3, 15]];
  it("最大利润 142（暴力验证最优），时间槽分配满足各自 deadline", () => {
    const r = execTemplate("job-scheduling");
    expect(numVar(r, "js.jobs")).toBe(5);
    expect(numVar(r, "js.scheduled")).toBe(3);
    expect(numVar(r, "js.totalProfit")).toBe(142);
    // 独立最优性：暴力枚举 2^5 个子集；可行性定义：按 deadline 升序，
    // 第 k 个（1-based）作业满足 deadline ≥ k。最大可行利润应为 142。
    let best = 0;
    for (let mask = 0; mask < 1 << jobs.length; mask++) {
      const sub = jobs
        .filter((_, i) => mask & (1 << i))
        .sort((a, b) => a[0] - b[0]);
      const feasible = sub.every(([d], k) => d >= k + 1);
      if (feasible) best = Math.max(best, sub.reduce((s, [, p]) => s + p, 0));
    }
    expect(best).toBe(142);
    // 时间槽（1-based）分配：每个作业的槽位 ≤ 其 deadline，利润和 = 142
    const { arrays } = multiArrays(r, "js");
    const slots = arrays[1].map(String);
    expect(slots).toHaveLength(3);
    let sum = 0;
    slots.forEach((s, idx) => {
      const m = s.match(/#(\d+)\(p=(\d+)\)/);
      expect(m, `slot format: ${s}`).not.toBeNull();
      const jobIdx = Number(m![1]);
      const profit = Number(m![2]);
      expect(profit).toBe(jobs[jobIdx][1]);
      expect(idx + 1).toBeLessThanOrEqual(jobs[jobIdx][0]);
      sum += profit;
    });
    expect(sum).toBe(142);
  });
});
