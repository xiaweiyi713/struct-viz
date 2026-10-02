/**
 * 数据结构-树结构 24 个模板的逐个验证。
 *
 * 方法：取 templates.ts 中每个模板的精确 code 字符串，经 parser.parse 解析、
 * createRuntime().execute 执行（与线上 Worker 同一套管线），然后对最终帧的
 * snapshot / trace 做断言。
 *
 * 正确性期望全部来自数据结构定义（BST 性质、红黑性质、AVL 平衡、B 树/B+ 树/
 * 2-3 树不变式、Trie 单词语义、Huffman 最优性、Splay 伸展语义、跳表层级语义），
 * 独立手算/推导，不以实现输出反推期望。
 */
import { describe, it, expect } from "vitest";
import { parse } from "../parser/parser";
import { createRuntime } from "../executor";
import { templates } from "../../data/templates";
import type { VisualTreeNode, TraceEvent } from "../../types/trace";

type ExecResult = ReturnType<ReturnType<typeof createRuntime>["execute"]>;
type TreeNodes = Record<string, VisualTreeNode>;

// ── 通用脚手架 ──────────────────────────────────────────────

function getCode(id: string): string {
  const t = templates.find((x) => x.id === id);
  if (!t) throw new Error(`template ${id} not found in templates.ts`);
  return t.code;
}

/** 解析 + 执行模板，断言管线本身无错且有 trace */
function runTemplate(id: string): ExecResult {
  const code = getCode(id);
  const pr = parse(code);
  expect(pr.errors, `${id}: parse errors: ${JSON.stringify(pr.errors)}`).toHaveLength(0);
  expect(pr.program, `${id}: parse produced no program`).toBeTruthy();
  const r = createRuntime().execute(pr.program!);
  expect(r.errors, `${id}: runtime errors: ${JSON.stringify(r.errors)}`).toHaveLength(0);
  expect(r.frames.length, `${id}: no trace frames`).toBeGreaterThan(0);
  return r;
}

function treeOf(r: ExecResult, id: string): { nodes: TreeNodes; rootId: string | null } {
  const structs = r.frames[r.frames.length - 1].snapshot.structures;
  const s = Object.values(structs).find((x) => x.type === "tree");
  expect(s, `${id}: no tree structure in final snapshot`).toBeTruthy();
  const t = s as { type: "tree"; nodes: TreeNodes; rootId: string | null };
  return { nodes: t.nodes, rootId: t.rootId };
}

function eventsOf(r: ExecResult): TraceEvent[] {
  return r.frames.map((f) => f.event);
}

/** 二叉树中序遍历（键） */
function inorderKeys(nodes: TreeNodes, rootId: string | null): number[] {
  if (!rootId) return [];
  const n = nodes[rootId];
  return [...inorderKeys(nodes, n.left), Number(n.key), ...inorderKeys(nodes, n.right)];
}

/** BST 性质：左子树 < 节点 < 右子树（严格） */
function expectBST(nodes: TreeNodes, rootId: string | null, lo = -Infinity, hi = Infinity): void {
  if (!rootId) return;
  const n = nodes[rootId];
  const k = Number(n.key);
  expect(k, `BST violated at node ${n.key}: not in (${lo}, ${hi})`).toBeGreaterThan(lo);
  expect(k, `BST violated at node ${n.key}: not in (${lo}, ${hi})`).toBeLessThan(hi);
  expectBST(nodes, n.left, lo, k);
  expectBST(nodes, n.right, k, hi);
}

function heightOf(nodes: TreeNodes, rootId: string | null): number {
  if (!rootId) return 0;
  const n = nodes[rootId];
  return 1 + Math.max(heightOf(nodes, n.left), heightOf(nodes, n.right));
}

/** 红黑性质：根黑、无连续红、黑高一致；返回黑高 */
function expectRedBlack(nodes: TreeNodes, rootId: string): number {
  const root = nodes[rootId];
  expect(root.color, `RB: root ${root.key} must be black`).toBe("black");
  const bh = (id: string | null): number => {
    if (!id) return 1; // 空叶子视为黑色
    const x = nodes[id];
    expect(["red", "black"]).toContain(x.color);
    if (x.color === "red") {
      for (const c of [x.left, x.right]) {
        if (c) expect(nodes[c].color, `RB: red node ${x.key} has red child`).not.toBe("red");
      }
    }
    const l = bh(x.left);
    const r = bh(x.right);
    expect(l, `RB: black-height mismatch at node ${x.key}`).toBe(r);
    return l + (x.color === "black" ? 1 : 0);
  };
  return bh(rootId);
}

/** AVL：BST + 所有节点平衡因子绝对值 ≤ 1，且 metadata 高度自洽 */
function expectAVL(nodes: TreeNodes, rootId: string | null): void {
  expectBST(nodes, rootId);
  const check = (id: string | null): number => {
    if (!id) return 0;
    const n = nodes[id];
    const hl = check(n.left);
    const hr = check(n.right);
    expect(Math.abs(hl - hr), `AVL unbalanced at ${n.key}: hl=${hl} hr=${hr}`).toBeLessThanOrEqual(1);
    const md = n.metadata as { height?: number; balanceFactor?: number } | undefined;
    if (md?.height !== undefined) {
      // 注意：height/balanceFactor 元数据取自 trace 快照。若实现在最后一次
      // record() 之后还静默更新了高度（如 AVL rebalance），快照即滞后。
      // 此处按“快照应精确反映最终状态”断言；失败即为可视化 bug。
      expect(md.height, `AVL 快照 height 元数据滞后 @${n.key}：快照=${md.height}，真实=${1 + Math.max(hl, hr)}`).toBe(
        1 + Math.max(hl, hr),
      );
    }
    if (md?.balanceFactor !== undefined) {
      expect(Math.abs(md.balanceFactor), `AVL balanceFactor out of range at ${n.key}`).toBeLessThanOrEqual(1);
      // balanceFactor 应等于左高-右高（实现自身 getBalance 的定义）；快照滞后时此处也会失配
      expect(md.balanceFactor, `AVL 快照 balanceFactor 滞后 @${n.key}：快照=${md.balanceFactor}，真实=${hl - hr}`).toBe(
        hl - hr,
      );
    }
    return 1 + Math.max(hl, hr);
  };
  check(rootId);
}

/** B 树族节点的关键字数组 */
function nodeKeys(n: VisualTreeNode): number[] {
  return ((n.metadata as { keys?: number[] } | undefined)?.keys ?? []) as number[];
}

/**
 * B 树不变式（最小度数 t）：
 * - 节点内关键字有序；非根节点 t-1 ≤ keys ≤ 2t-1；根 1 ≤ keys ≤ 2t-1
 * - 内节点 children 数 = keys 数 + 1
 * - 所有叶子等深；子树关键字区间满足 BST 序
 */
function expectBTree(nodes: TreeNodes, rootId: string, t: number, expectedKeys: number[]): void {
  const maxKeys = 2 * t - 1;
  const check = (id: string, lo: number, hi: number, isRoot: boolean): number => {
    const n = nodes[id];
    const keys = nodeKeys(n);
    expect(keys, `BTree node ${id} keys sorted`).toEqual([...keys].sort((a, b) => a - b));
    expect(keys.length, `BTree node ${id} key count`).toBeGreaterThanOrEqual(isRoot ? 1 : t - 1);
    expect(keys.length, `BTree node ${id} key count`).toBeLessThanOrEqual(maxKeys);
    for (const k of keys) {
      expect(k, `BTree key ${k} out of range (${lo}, ${hi})`).toBeGreaterThan(lo);
      expect(k, `BTree key ${k} out of range (${lo}, ${hi})`).toBeLessThan(hi);
    }
    const isLeaf = (n.metadata as { isLeaf?: boolean } | undefined)?.isLeaf;
    const children = n.children ?? [];
    if (isLeaf) {
      expect(children.length, `BTree leaf ${id} should have no children`).toBe(0);
      return 0;
    }
    expect(children.length, `BTree internal node ${id}: children = keys+1`).toBe(keys.length + 1);
    const depths = children.map((c, i) => {
      const clo = i === 0 ? lo : keys[i - 1];
      const chi = i === keys.length ? hi : keys[i];
      return check(c, clo, chi, false);
    });
    for (const d of depths) expect(d, `BTree leaves not at same depth`).toBe(depths[0]);
    return 1 + depths[0];
  };
  check(rootId, -Infinity, Infinity, true);
  const all: number[] = [];
  for (const n of Object.values(nodes)) all.push(...nodeKeys(n));
  expect(all.sort((a, b) => a - b)).toEqual([...expectedKeys].sort((a, b) => a - b));
}

/** 2-3 树不变式：每节点 1~2 个关键字，children = keys+1，完美平衡（叶等深） */
function expectTwoThreeTree(nodes: TreeNodes, rootId: string, expectedKeys: number[]): void {
  const check = (id: string, lo: number, hi: number): number => {
    const n = nodes[id];
    const keys = nodeKeys(n);
    expect(keys, `2-3 node ${id} keys sorted`).toEqual([...keys].sort((a, b) => a - b));
    expect(keys.length, `2-3 node ${id} must hold 1~2 keys`).toBeGreaterThanOrEqual(1);
    expect(keys.length, `2-3 node ${id} must hold 1~2 keys`).toBeLessThanOrEqual(2);
    for (const k of keys) {
      expect(k).toBeGreaterThan(lo);
      expect(k).toBeLessThan(hi);
    }
    const isLeaf = (n.metadata as { isLeaf?: boolean } | undefined)?.isLeaf;
    const children = n.children ?? [];
    if (isLeaf) {
      expect(children.length).toBe(0);
      return 0;
    }
    expect(children.length, `2-3 internal node ${id}: children = keys+1`).toBe(keys.length + 1);
    const depths = children.map((c, i) =>
      check(c, i === 0 ? lo : keys[i - 1], i === keys.length ? hi : keys[i]),
    );
    for (const d of depths) expect(d, `2-3 tree not perfectly balanced`).toBe(depths[0]);
    return 1 + depths[0];
  };
  check(rootId, -Infinity, Infinity);
  const all: number[] = [];
  for (const n of Object.values(nodes)) all.push(...nodeKeys(n));
  expect(all.sort((a, b) => a - b)).toEqual([...expectedKeys].sort((a, b) => a - b));
}

/**
 * B+ 树不变式（最小度数 t）：
 * - 数据只在叶子；叶子经 nextLeaf 按序串成有序链表，恰好覆盖 expectedKeys
 * - 内节点 keys 为分隔键：child[i] 的叶键 < sep[i] ≤ child[i+1] 的叶键
 * - children = keys+1；叶等深；非根节点 2~5 个键（t=3）
 */
function expectBPlusTree(nodes: TreeNodes, rootId: string, t: number, expectedKeys: number[]): void {
  const maxKeys = 2 * t - 1;
  const minKeys = t - 1;
  const isLeaf = (n: VisualTreeNode) =>
    ((n.metadata as { isLeaf?: boolean } | undefined)?.isLeaf ?? false);
  // 从最左叶子沿 nextLeaf 走，收集数据键
  const leftmost = (id: string): string => {
    const n = nodes[id];
    if (isLeaf(n)) return id;
    return leftmost((n.children ?? [])[0]);
  };
  const seq: number[] = [];
  let cur: string | null | undefined = leftmost(rootId);
  const seen = new Set<string>();
  while (cur) {
    if (seen.has(cur)) throw new Error("B+ leaf linked list has a cycle");
    seen.add(cur);
    const n = nodes[cur];
    const keys = nodeKeys(n);
    expect(keys, `B+ leaf ${cur} keys sorted`).toEqual([...keys].sort((a, b) => a - b));
    seq.push(...keys);
    cur = (n.metadata as { nextLeaf?: string | null } | undefined)?.nextLeaf;
  }
  expect(seq, "B+ leaf chain must cover exactly the expected keys in order").toEqual(
    [...expectedKeys].sort((a, b) => a - b),
  );
  // 每个节点的键数范围
  for (const [id, n] of Object.entries(nodes)) {
    const keys = nodeKeys(n);
    const lo = id === rootId ? 1 : minKeys;
    expect(keys.length, `B+ node ${id} key count`).toBeGreaterThanOrEqual(lo);
    expect(keys.length, `B+ node ${id} key count`).toBeLessThanOrEqual(maxKeys);
  }
  // 内节点分隔键语义 + 叶等深
  const leafKeyRange = (id: string): [number, number] => {
    const n = nodes[id];
    if (isLeaf(n)) {
      const ks = nodeKeys(n);
      return [ks[0], ks[ks.length - 1]];
    }
    const rs = (n.children ?? []).map(leafKeyRange);
    return [rs[0][0], rs[rs.length - 1][1]];
  };
  const checkInternal = (id: string): number => {
    const n = nodes[id];
    if (isLeaf(n)) return 0;
    const keys = nodeKeys(n);
    const children = n.children ?? [];
    expect(children.length, `B+ internal node ${id}: children = keys+1`).toBe(keys.length + 1);
    const ranges = children.map(leafKeyRange);
    for (let i = 0; i < keys.length; i++) {
      expect(ranges[i][1], `B+ separator ${keys[i]}: left child max must be < sep`).toBeLessThan(keys[i]);
      expect(keys[i], `B+ separator ${keys[i]}: sep must be <= right child min`).toBeLessThanOrEqual(
        ranges[i + 1][0],
      );
    }
    const depths = children.map(checkInternal);
    for (const d of depths) expect(d, "B+ leaves not at same depth").toBe(depths[0]);
    return 1 + depths[0];
  };
  checkInternal(rootId);
}

/** 查找类模板：断言 trace 里有 found=true/false 且标题包含目标键 */
function expectSearchOutcome(r: ExecResult, id: string, key: string | number, found: boolean): void {
  const hits = eventsOf(r).filter(
    (e) => (e as unknown as { payload?: { found?: boolean } }).payload?.found === found &&
      e.title.includes(String(key)),
  );
  expect(hits.length, `${id}: expected search(${key}) found=${found} event`).toBeGreaterThan(0);
}

/** 从根经 parent 链计算叶子深度；返回 WPL = Σ weight × depth */
function huffmanWPL(nodes: TreeNodes, rootId: string): { wpl: number; leaves: { key: string; weight: number; depth: number }[] } {
  const depthOf = (id: string): number => {
    let d = 0;
    let cur: VisualTreeNode | undefined = nodes[id];
    while (cur?.parent) {
      d += 1;
      cur = nodes[cur.parent];
    }
    return d;
  };
  const leaves: { key: string; weight: number; depth: number }[] = [];
  for (const [id, n] of Object.entries(nodes)) {
    if ((n.metadata as { isLeaf?: boolean } | undefined)?.isLeaf) {
      leaves.push({ key: String(n.key), weight: (n.metadata as { weight: number }).weight, depth: depthOf(id) });
    }
  }
  return { wpl: leaves.reduce((s, l) => s + l.weight * l.depth, 0), leaves };
}

describe("BST", () => {
  it("bst-insert: 插入 7 个键，中序有序且满足 BST 性质", () => {
    const r = runTemplate("bst-insert");
    const { nodes, rootId } = treeOf(r, "bst-insert");
    expect(rootId).toBeTruthy();
    // 期望（按 BST 插入定义手推）：
    //  8 为根；3 左、10 右；1 左于 3；6 右于 3；14 右于 10；4 左于 6
    expect(inorderKeys(nodes, rootId)).toEqual([1, 3, 4, 6, 8, 10, 14]);
    expectBST(nodes, rootId);
    expect(Object.keys(nodes)).toHaveLength(7);
    expect(Number(nodes[rootId!].key)).toBe(8);
  });

  it("bst-delete: 删除 3（双子→后继 4 替换）、10（单子→14 替换）、1（叶子)", () => {
    const r = runTemplate("bst-delete");
    const { nodes, rootId } = treeOf(r, "bst-delete");
    // 期望键集合：{8,3,10,1,6,14,4} - {3,10,1} = {4,6,8,14}
    expect(inorderKeys(nodes, rootId)).toEqual([4, 6, 8, 14]);
    expectBST(nodes, rootId);
    expect(Object.keys(nodes)).toHaveLength(4);
  });

  it("bst-search: search(6) 命中、search(7) 未命中，树结构不变", () => {
    const r = runTemplate("bst-search");
    expectSearchOutcome(r, "bst-search", 6, true);
    expectSearchOutcome(r, "bst-search", 7, false);
    const { nodes, rootId } = treeOf(r, "bst-search");
    expect(inorderKeys(nodes, rootId)).toEqual([1, 3, 4, 6, 8, 10, 14]);
    expectBST(nodes, rootId);
  });
});

describe("红黑树", () => {
  it("rbtree-insert: 插入 10,20,30,15,25，红黑性质成立", () => {
    const r = runTemplate("rbtree-insert");
    const { nodes, rootId } = treeOf(r, "rbtree-insert");
    expect(rootId).toBeTruthy();
    expect(inorderKeys(nodes, rootId)).toEqual([10, 15, 20, 25, 30]);
    expectBST(nodes, rootId);
    const bh = expectRedBlack(nodes, rootId!);
    expect(bh).toBeGreaterThan(0);
    expect(Object.keys(nodes)).toHaveLength(5);
  });

  it("rbtree-delete: 删除 20、10 后红黑性质仍成立", () => {
    const r = runTemplate("rbtree-delete");
    const { nodes, rootId } = treeOf(r, "rbtree-delete");
    // 期望键集合：{10,15,20,25,30} - {20,10} = {15,25,30}
    expect(inorderKeys(nodes, rootId)).toEqual([15, 25, 30]);
    expectBST(nodes, rootId);
    expectRedBlack(nodes, rootId!);
    expect(Object.keys(nodes)).toHaveLength(3);
  });

  it("rbtree-search: search(15) 命中、search(12) 未命中", () => {
    const r = runTemplate("rbtree-search");
    expectSearchOutcome(r, "rbtree-search", 15, true);
    expectSearchOutcome(r, "rbtree-search", 12, false);
    const { nodes, rootId } = treeOf(r, "rbtree-search");
    expect(inorderKeys(nodes, rootId)).toEqual([10, 15, 20, 25, 30]);
    expectRedBlack(nodes, rootId!);
  });
});

describe("AVL 树", () => {
  it("avl-insert: 插入 10,20,30,5,15,25，所有节点平衡因子 |bf| ≤ 1", () => {
    const r = runTemplate("avl-insert");
    const { nodes, rootId } = treeOf(r, "avl-insert");
    expect(rootId).toBeTruthy();
    expect(inorderKeys(nodes, rootId)).toEqual([5, 10, 15, 20, 25, 30]);
    expectAVL(nodes, rootId);
    expect(Object.keys(nodes)).toHaveLength(6);
    // 6 个节点的 AVL 树高必 ≤ 3（Fibonacci 界）
    expect(heightOf(nodes, rootId)).toBeLessThanOrEqual(3);
  });

  it("avl-delete: 删除 20、5 后仍为合法 AVL", () => {
    const r = runTemplate("avl-delete");
    const { nodes, rootId } = treeOf(r, "avl-delete");
    // 期望键集合：{5,10,15,20,25,30} - {20,5} = {10,15,25,30}
    expect(inorderKeys(nodes, rootId)).toEqual([10, 15, 25, 30]);
    expectAVL(nodes, rootId);
    expect(Object.keys(nodes)).toHaveLength(4);
  });

  it("avl-search: search(15) 命中、search(12) 未命中", () => {
    const r = runTemplate("avl-search");
    expectSearchOutcome(r, "avl-search", 15, true);
    expectSearchOutcome(r, "avl-search", 12, false);
    const { nodes, rootId } = treeOf(r, "avl-search");
    expectAVL(nodes, rootId);
  });
});

describe("B 树", () => {
  const ALL = [1, 4, 7, 10, 17, 19, 20, 21, 25, 31];
  it("btree-insert: BTree(3) 插入 10 个键，满足 B 树不变式", () => {
    const r = runTemplate("btree-insert");
    const { nodes, rootId } = treeOf(r, "btree-insert");
    expect(rootId).toBeTruthy();
    // 最小度数 t=3：节点键数 2~5（根 1~5），分裂阈值 5
    expectBTree(nodes, rootId!, 3, ALL);
  });

  it("btree-delete: 删除 17、10、4 后仍满足 B 树不变式", () => {
    const r = runTemplate("btree-delete");
    const { nodes, rootId } = treeOf(r, "btree-delete");
    // 期望键集合：ALL - {17,10,4}
    expectBTree(nodes, rootId!, 3, [1, 7, 19, 20, 21, 25, 31]);
  });

  it("btree-search: search(17) 命中、search(5) 未命中", () => {
    const r = runTemplate("btree-search");
    expectSearchOutcome(r, "btree-search", 17, true);
    expectSearchOutcome(r, "btree-search", 5, false);
    const { nodes, rootId } = treeOf(r, "btree-search");
    expectBTree(nodes, rootId!, 3, [1, 4, 7, 10, 17, 21, 25, 31]);
  });
});

describe("B+ 树", () => {
  const ALL = [1, 4, 7, 10, 17, 19, 20, 21, 25, 31];
  it("bplustree-insert: 数据全在叶子层且链表有序，满足 B+ 树不变式", () => {
    const r = runTemplate("bplustree-insert");
    const { nodes, rootId } = treeOf(r, "bplustree-insert");
    expect(rootId).toBeTruthy();
    expectBPlusTree(nodes, rootId!, 3, ALL);
  });

  it("bplustree-delete: 删除 17、7、4 后叶子数据正确且不变式成立", () => {
    const r = runTemplate("bplustree-delete");
    const { nodes, rootId } = treeOf(r, "bplustree-delete");
    // 期望叶子键集合：ALL - {17,7,4}
    expectBPlusTree(nodes, rootId!, 3, [1, 10, 19, 20, 21, 25, 31]);
  });

  it("bplustree-search: search(17) 命中、search(5) 未命中", () => {
    const r = runTemplate("bplustree-search");
    expectSearchOutcome(r, "bplustree-search", 17, true);
    expectSearchOutcome(r, "bplustree-search", 5, false);
    const { nodes, rootId } = treeOf(r, "bplustree-search");
    expectBPlusTree(nodes, rootId!, 3, [1, 4, 7, 10, 17, 21, 25, 31]);
  });
});

describe("2-3 树", () => {
  it("twothree-insert: 插入 8 个键，完美平衡且每节点 1~2 个键", () => {
    const r = runTemplate("twothree-insert");
    const { nodes, rootId } = treeOf(r, "twothree-insert");
    expect(rootId).toBeTruthy();
    expectTwoThreeTree(nodes, rootId!, [5, 6, 7, 10, 12, 17, 20, 30]);
  });

  it("twothree-delete: 删除 10、6、30 后仍完美平衡", () => {
    const r = runTemplate("twothree-delete");
    const { nodes, rootId } = treeOf(r, "twothree-delete");
    // 期望键集合：{5,6,7,10,12,17,20,30} - {10,6,30}
    expectTwoThreeTree(nodes, rootId!, [5, 7, 12, 17, 20]);
  });
});

describe("Splay 树", () => {
  it("splay-insert: search(10) 后 10 被伸展到根", () => {
    const r = runTemplate("splay-insert");
    const { nodes, rootId } = treeOf(r, "splay-insert");
    expect(rootId).toBeTruthy();
    // Splay 定义：每次访问后被访问节点旋转到根
    expect(Number(nodes[rootId!].key), "search(10) 后根应为 10").toBe(10);
    expect(inorderKeys(nodes, rootId)).toEqual([5, 10, 15, 20, 30]);
    expectBST(nodes, rootId);
    expect(Object.keys(nodes)).toHaveLength(5);
  });

  it("splay-delete: 删除 20、10 后剩余键正确且满足 BST 性质", () => {
    const r = runTemplate("splay-delete");
    const { nodes, rootId } = treeOf(r, "splay-delete");
    // 期望键集合：{5,10,15,20,30} - {20,10}
    expect(inorderKeys(nodes, rootId)).toEqual([5, 15, 30]);
    expectBST(nodes, rootId);
    expect(Object.keys(nodes)).toHaveLength(3);
  });
});

describe("Trie 字典树", () => {
  /** 从快照重建单词集合：沿 edgeLabel 拼接，isEnd=true 的节点对应单词 */
  function collectWords(nodes: TreeNodes, rootId: string): string[] {
    const words: string[] = [];
    const dfs = (id: string, prefix: string) => {
      const n = nodes[id];
      const md = n.metadata as { isEnd?: boolean; edgeLabel?: string } | undefined;
      const cur = n.key === "root" ? "" : prefix + (md?.edgeLabel ?? "");
      if (md?.isEnd) words.push(cur);
      for (const c of n.children ?? []) dfs(c, cur);
    };
    dfs(rootId, "");
    return words.sort();
  }

  it("trie-insert: 插入 4 词，search(app/apple) 命中、search(ban) 未命中", () => {
    const r = runTemplate("trie-insert");
    const evs = eventsOf(r);
    const ok = (w: string) =>
      evs.some((e) => e.type === "MARK_FINAL" && e.title.includes(`"${w}"`) && e.title.includes("成功"));
    const fail = (w: string) =>
      evs.some(
        (e) =>
          e.title.includes(`"${w}"`) && (e.title.includes("失败") || e.title.includes("前缀")),
      );
    expect(ok("app"), 'trie-insert: search("app") 应成功').toBe(true);
    expect(ok("apple"), 'trie-insert: search("apple") 应成功').toBe(true);
    expect(fail("ban"), 'trie-insert: search("ban") 应失败（仅为前缀非单词）').toBe(true);

    const { nodes, rootId } = treeOf(r, "trie-insert");
    expect(rootId).toBeTruthy();
    // Trie 定义：单词集合恰为插入的 4 个串
    expect(collectWords(nodes, rootId!)).toEqual(["app", "apple", "apply", "banana"]);
    const vars = r.frames[r.frames.length - 1].snapshot.variables as Record<string, { value: number }>;
    expect(vars["t.words"].value).toBe(4);
  });

  it("trie-delete: 删除 app、apple、banana 后仅剩 apply", () => {
    const r = runTemplate("trie-delete");
    const { nodes, rootId } = treeOf(r, "trie-delete");
    expect(rootId).toBeTruthy();
    // Trie 删除定义：取消终点标记并回收不再被共享的节点
    expect(collectWords(nodes, rootId!)).toEqual(["apply"]);
    const vars = r.frames[r.frames.length - 1].snapshot.variables as Record<string, { value: number }>;
    expect(vars["t.words"].value).toBe(1);
    // "app" 的路径节点仍存在（被 "apply" 共享），但终点标记已清除
    const isEndOf = (prefix: string): boolean | undefined => {
      let id = rootId!;
      for (const ch of prefix) {
        const n = nodes[id];
        const child = (n.children ?? []).find(
          (c) => (nodes[c].metadata as { edgeLabel?: string } | undefined)?.edgeLabel === ch,
        );
        if (!child) return undefined;
        id = child;
      }
      return (nodes[id].metadata as { isEnd?: boolean } | undefined)?.isEnd;
    };
    expect(isEndOf("app")).toBe(false);
    expect(isEndOf("apply")).toBe(true);
    expect(isEndOf("apple")).toBe(undefined);
    expect(isEndOf("banana")).toBe(undefined);
  });
});

describe("哈夫曼树", () => {
  it("huffman: build(5,29,7,8,14,23,3,11) 构造最优树，WPL=271", () => {
    const r = runTemplate("huffman");
    const { nodes, rootId } = treeOf(r, "huffman");
    expect(rootId).toBeTruthy();
    // Huffman 定义：n 个权 → 2n-1 个节点；根权 = 权和
    expect(Object.keys(nodes)).toHaveLength(15);
    const weights = [5, 29, 7, 8, 14, 23, 3, 11];
    const total = weights.reduce((a, b) => a + b, 0);
    expect(Number(nodes[rootId!].key)).toBe(total);

    const { wpl, leaves } = huffmanWPL(nodes, rootId!);
    expect(leaves).toHaveLength(8);
    expect(leaves.map((l) => l.weight).sort((a, b) => a - b)).toEqual([...weights].sort((a, b) => a - b));
    // 最优 WPL 独立手算：贪心合并序列 3+5=8, 7+8=15, 8+11=19, 14+15=29,
    // 19+23=42, 29+29=58, 42+58=100；WPL = 各合并节点权和 = 8+15+19+29+42+58+100 = 271
    expect(wpl).toBe(271);

    // 每个内部节点权 = 左右子权和（Huffman 合并语义）
    const subWeight = (id: string): number => {
      const n = nodes[id];
      if ((n.metadata as { isLeaf?: boolean } | undefined)?.isLeaf) {
        return (n.metadata as { weight: number }).weight;
      }
      return subWeight(n.left!) + subWeight(n.right!);
    };
    for (const [id, n] of Object.entries(nodes)) {
      if (!(n.metadata as { isLeaf?: boolean } | undefined)?.isLeaf) {
        expect(Number(n.key), `内部节点 ${id} 权应为子权和`).toBe(subWeight(id));
      }
    }
  });
});

describe("哈夫曼编码解码", () => {
  it("ds-huffman-decode: build(5,9,12,13,16,45) 编码表最优，encode(D/A) 正确", () => {
    const r = runTemplate("ds-huffman-decode");
    const { nodes, rootId } = treeOf(r, "ds-huffman-decode");
    expect(rootId).toBeTruthy();

    // 字符按频率顺序标号 A..F：A=5,B=9,C=12,D=13,E=16,F=45
    const { wpl, leaves } = huffmanWPL(nodes, rootId!);
    // 最优 WPL 独立手算：合并 5+9=14, 12+13=25, 14+16=30, 25+30=55, 45+55=100
    // WPL = 14+25+30+55+100 = 224
    expect(wpl).toBe(224);
    const byKey = Object.fromEntries(leaves.map((l) => [l.key, l]));
    expect(Object.keys(byKey).sort()).toEqual(["A", "B", "C", "D", "E", "F"]);
    // 各字符深度由合并结构唯一确定（全程无并列二义）：A,B=4; C,D,E=3; F=1
    expect(byKey["A"].depth).toBe(4);
    expect(byKey["B"].depth).toBe(4);
    expect(byKey["C"].depth).toBe(3);
    expect(byKey["D"].depth).toBe(3);
    expect(byKey["E"].depth).toBe(3);
    expect(byKey["F"].depth).toBe(1);

    // 编码表：前缀码（任一码不是另一码的前缀）
    const codes: Record<string, string> = {};
    for (const [id, n] of Object.entries(nodes)) {
      const md = n.metadata as { isLeaf?: boolean; code?: string } | undefined;
      if (md?.isLeaf && md.code !== undefined) codes[String(n.key)] = md.code;
    }
    expect(Object.keys(codes).sort()).toEqual(["A", "B", "C", "D", "E", "F"]);
    const vals = Object.values(codes);
    for (let i = 0; i < vals.length; i++) {
      for (let j = 0; j < vals.length; j++) {
        if (i !== j) expect(vals[j].startsWith(vals[i]), `前缀码冲突: ${vals[i]} vs ${vals[j]}`).toBe(false);
      }
      expect(vals[i]).toMatch(/^[01]+$/);
    }
    // 左 0 右 1：叶码应等于从根出发的左右路径
    const pathOf = (leafId: string): string => {
      let bits = "";
      let cur: VisualTreeNode | undefined = nodes[leafId];
      while (cur?.parent) {
        const p = nodes[cur.parent];
        bits = (p.left === cur.id ? "0" : "1") + bits;
        cur = p;
      }
      return bits;
    };
    for (const [id, n] of Object.entries(nodes)) {
      const md = n.metadata as { isLeaf?: boolean; code?: string } | undefined;
      if (md?.isLeaf) expect(md.code, `叶子 ${n.key} 的码应等于左右路径`).toBe(pathOf(id));
    }

    // encode 事件的码与编码表一致
    const enc = (ch: string): string => {
      const e = eventsOf(r).find(
        (x) => (x as unknown as { payload?: { char?: string; code?: string } }).payload?.char === ch,
      );
      expect(e, `encode("${ch}") 事件缺失`).toBeTruthy();
      return (e as unknown as { payload: { code: string } }).payload.code;
    };
    expect(enc("D")).toBe(codes["D"]);
    expect(enc("A")).toBe(codes["A"]);
    // 按“左小右大、左 0 右 1”的常规实现，期望 D=101、A=1100（与码长/结构一致）
    expect(codes["D"]).toBe("101");
    expect(codes["A"]).toBe("1100");
  });
});

describe("跳表", () => {
  it("skiplist: 插入 7 个键，各层有序嵌套，search(12) 命中", () => {
    const r = runTemplate("skiplist");
    const structs = r.frames[r.frames.length - 1].snapshot.structures;
    const s = Object.values(structs).find((x) => x.type === "multiarray");
    expect(s, "skiplist: no multiarray structure").toBeTruthy();
    const arrays = (s as { type: "multiarray"; arrays: { value: number | string }[][] }).arrays;
    expect(arrays.length).toBeGreaterThan(0);

    const nums = (lvl: { value: number | string }[]) =>
      lvl.filter((x) => typeof x.value === "number").map((x) => x.value as number);
    // 每层以 H 开头、T 结尾
    for (const lvl of arrays) {
      expect(lvl[0].value).toBe("H");
      expect(lvl[lvl.length - 1].value).toBe("T");
    }
    // 按层大小降序即为自底向上；最大层含全部键且有序
    const bySize = [...arrays].sort((a, b) => nums(b).length - nums(a).length);
    expect(nums(bySize[0])).toEqual([3, 6, 7, 9, 12, 17, 19]);
    // 跳表定义：上层是下层的子集（快速通道），每层内部有序
    for (let i = 0; i < bySize.length; i++) {
      const cur = nums(bySize[i]);
      expect(cur, `level ${i} must be sorted`).toEqual([...cur].sort((a, b) => a - b));
      if (i > 0) {
        const lower = new Set(nums(bySize[i - 1]));
        for (const k of cur) expect(lower.has(k), `key ${k} not in lower level`).toBe(true);
      }
    }

    // search(12) 命中
    const found = eventsOf(r).some(
      (e) => e.type === "MARK_FINAL" && e.title.includes("找到 key = 12"),
    );
    expect(found, "skiplist: search(12) 应命中").toBe(true);
  });
});
