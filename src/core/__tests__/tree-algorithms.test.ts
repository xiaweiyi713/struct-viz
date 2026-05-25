import { describe, it, expect } from "vitest";
import { parse } from "../parser/parser";
import { createRuntime } from "../executor";
import type { VisualTreeNode, VisualStructure } from "../../types";

/** 辅助：执行代码并返回结果 */
function exec(code: string) {
  const result = parse(code);
  expect(result.errors).toHaveLength(0);
  const runtime = createRuntime();
  return runtime.execute(result.program!);
}

/** 辅助：获取最终快照中的结构 */
function getLastStruct<T extends VisualStructure>(
  execResult: ReturnType<ReturnType<typeof createRuntime>["execute"]>,
  expectedType: T["type"],
): Extract<VisualStructure, { type: T["type"] }> {
  const lastFrame = execResult.frames[execResult.frames.length - 1];
  const structures = lastFrame.snapshot.structures;
  const struct = Object.values(structures)[0] as Extract<VisualStructure, { type: T["type"] }>;
  expect(struct.type).toBe(expectedType);
  return struct;
}

/** 辅助：获取树结构 */
function getTree(r: ReturnType<ReturnType<typeof createRuntime>["execute"]>) {
  return getLastStruct<"tree">(r, "tree");
}

// ─── BST ───

describe("BST", () => {
  it("插入多个节点并形成正确的树结构", () => {
    const r = exec(`BST tree;
tree.insert(8);
tree.insert(3);
tree.insert(10);
tree.insert(1);
tree.insert(6);
tree.insert(14);`);

    expect(r.errors).toHaveLength(0);
    expect(r.frames.length).toBeGreaterThan(0);

    const tree = getTree(r);
    expect(Object.keys(tree.nodes)).toHaveLength(6);
    expect(tree.rootId).toBeTruthy();
    expect(tree.nodes[tree.rootId!].key).toBe(8);

    const root = tree.nodes[tree.rootId!];
    expect(tree.nodes[root.left!].key).toBe(3);
    expect(tree.nodes[root.right!].key).toBe(10);
  });

  it("查找存在的节点", () => {
    const r = exec(`BST tree;
tree.insert(8);
tree.insert(3);
tree.insert(10);
tree.search(3);`);

    expect(r.errors).toHaveLength(0);
    expect(r.frames.length).toBeGreaterThan(0);
  });

  it("查找不存在的节点", () => {
    const r = exec(`BST tree;
tree.insert(8);
tree.insert(3);
tree.search(99);`);

    expect(r.errors).toHaveLength(0);
  });

  it("删除叶子节点", () => {
    const r = exec(`BST tree;
tree.insert(8);
tree.insert(3);
tree.insert(10);
tree.delete(3);`);

    expect(r.errors).toHaveLength(0);
    const tree = getTree(r);
    expect(Object.keys(tree.nodes)).toHaveLength(2);
    const root = tree.nodes[tree.rootId!];
    expect(root.left).toBeNull();
  });

  it("删除只有一个子节点的节点", () => {
    const r = exec(`BST tree;
tree.insert(8);
tree.insert(3);
tree.insert(10);
tree.insert(1);
tree.delete(3);`);

    expect(r.errors).toHaveLength(0);
    const tree = getTree(r);
    expect(Object.keys(tree.nodes)).toHaveLength(3);
    const root = tree.nodes[tree.rootId!];
    expect(tree.nodes[root.left!].key).toBe(1);
  });

  it("删除有两个子节点的节点", () => {
    const r = exec(`BST tree;
tree.insert(8);
tree.insert(3);
tree.insert(10);
tree.insert(1);
tree.insert(6);
tree.delete(3);`);

    expect(r.errors).toHaveLength(0);
    const tree = getTree(r);
    expect(Object.keys(tree.nodes)).toHaveLength(4);
  });

  it("空树操作不报错", () => {
    const r = exec(`BST tree;
tree.search(1);
tree.delete(1);`);

    expect(r.errors).toHaveLength(0);
  });

  it("重复插入同一值", () => {
    const r = exec(`BST tree;
tree.insert(5);
tree.insert(5);
tree.insert(5);`);

    expect(r.errors).toHaveLength(0);
    const tree = getTree(r);
    expect(Object.keys(tree.nodes).length).toBeGreaterThanOrEqual(1);
  });
});

// ─── AVL ───

describe("AVLTree", () => {
  it("插入节点并保持平衡（RR 型右旋）", () => {
    const r = exec(`AVLTree tree;
tree.insert(10);
tree.insert(20);
tree.insert(30);`);

    expect(r.errors).toHaveLength(0);
    const tree = getTree(r);
    expect(Object.keys(tree.nodes)).toHaveLength(3);
    expect(tree.nodes[tree.rootId!].key).toBe(20);
  });

  it("LL 型左旋", () => {
    const r = exec(`AVLTree tree;
tree.insert(30);
tree.insert(20);
tree.insert(10);`);

    expect(r.errors).toHaveLength(0);
    const tree = getTree(r);
    expect(tree.nodes[tree.rootId!].key).toBe(20);
  });

  it("LR 型双旋", () => {
    const r = exec(`AVLTree tree;
tree.insert(30);
tree.insert(10);
tree.insert(20);`);

    expect(r.errors).toHaveLength(0);
    const tree = getTree(r);
    expect(tree.nodes[tree.rootId!].key).toBe(20);
  });

  it("RL 型双旋", () => {
    const r = exec(`AVLTree tree;
tree.insert(10);
tree.insert(30);
tree.insert(20);`);

    expect(r.errors).toHaveLength(0);
    const tree = getTree(r);
    expect(tree.nodes[tree.rootId!].key).toBe(20);
  });

  it("大量插入触发多次旋转", () => {
    const code = `AVLTree tree;
tree.insert(41);
tree.insert(20);
tree.insert(65);
tree.insert(11);
tree.insert(29);
tree.insert(50);
tree.insert(26);`;
    const r = exec(code);

    expect(r.errors).toHaveLength(0);
    const tree = getTree(r);
    expect(Object.keys(tree.nodes)).toHaveLength(7);
  });

  it("删除后重新平衡", () => {
    const code = `AVLTree tree;
tree.insert(20);
tree.insert(10);
tree.insert(30);
tree.insert(5);
tree.insert(15);
tree.insert(25);
tree.insert(35);
tree.delete(35);
tree.delete(30);`;
    const r = exec(code);

    expect(r.errors).toHaveLength(0);
    const tree = getTree(r);
    expect(Object.keys(tree.nodes)).toHaveLength(5);
  });
});

// ─── RBTree ───

describe("RBTree", () => {
  it("插入节点产生着色帧", () => {
    const r = exec(`RBTree tree;
tree.insert(10);
tree.insert(20);
tree.insert(30);`);

    expect(r.errors).toHaveLength(0);
    const tree = getTree(r);
    expect(Object.keys(tree.nodes)).toHaveLength(3);
    const colors = Object.values(tree.nodes).map((n) => n.color);
    expect(colors.some((c) => c === "red" || c === "black")).toBe(true);
  });

  it("多个节点插入", () => {
    const code = `RBTree tree;
tree.insert(7);
tree.insert(3);
tree.insert(18);
tree.insert(10);
tree.insert(22);
tree.insert(8);
tree.insert(11);`;
    const r = exec(code);

    expect(r.errors).toHaveLength(0);
    const tree = getTree(r);
    expect(Object.keys(tree.nodes)).toHaveLength(7);
  });

  it("查找节点", () => {
    const r = exec(`RBTree tree;
tree.insert(10);
tree.insert(20);
tree.insert(5);
tree.search(20);`);

    expect(r.errors).toHaveLength(0);
  });
});

// ─── SplayTree ───

describe("SplayTree", () => {
  it("插入节点", () => {
    const r = exec(`SplayTree tree;
tree.insert(10);
tree.insert(20);
tree.insert(5);`);

    expect(r.errors).toHaveLength(0);
    const tree = getTree(r);
    expect(Object.keys(tree.nodes)).toHaveLength(3);
  });

  it("查找触发旋转（zig）", () => {
    // 先插入 10，再 20（20 是右子节点），search(20) 应该 splay 到根
    const r = exec(`SplayTree tree;
tree.insert(10);
tree.insert(20);
tree.search(20);`);

    expect(r.errors).toHaveLength(0);
    const tree = getTree(r);
    expect(tree.nodes[tree.rootId!].key).toBe(20);
  });

  it("查找不存在的值不报错", () => {
    const r = exec(`SplayTree tree;
tree.insert(10);
tree.insert(20);
tree.search(99);`);

    expect(r.errors).toHaveLength(0);
  });

  it("删除节点", () => {
    const r = exec(`SplayTree tree;
tree.insert(10);
tree.insert(5);
tree.insert(20);
tree.delete(5);`);

    expect(r.errors).toHaveLength(0);
    const tree = getTree(r);
    expect(Object.keys(tree.nodes)).toHaveLength(2);
  });
});

// ─── BTree ───

describe("BTree", () => {
  it("不同阶数产生不同结构", () => {
    const r2 = exec(`BTree tree(2);
tree.insert(10, 20, 30, 40, 50);`);
    expect(r2.errors).toHaveLength(0);
    const count2 = Object.keys(getTree(r2).nodes).length;

    const r5 = exec(`BTree tree(5);
tree.insert(10, 20, 30, 40, 50);`);
    expect(r5.errors).toHaveLength(0);
    const count5 = Object.keys(getTree(r5).nodes).length;

    expect(count2).toBeGreaterThan(count5);
  });

  it("搜索存在的键", () => {
    const r = exec(`BTree tree(3);
tree.insert(10, 20, 30);
tree.search(20);`);
    expect(r.errors).toHaveLength(0);
  });

  it("搜索不存在的键", () => {
    const r = exec(`BTree tree(3);
tree.insert(10, 20);
tree.search(99);`);
    expect(r.errors).toHaveLength(0);
  });

  it("删除操作", () => {
    const r = exec(`BTree tree(3);
tree.insert(1, 5, 9, 13, 17, 21, 25);
tree.delete(9);`);
    expect(r.errors).toHaveLength(0);
    const tree = getTree(r);
    expect(Object.keys(tree.nodes).length).toBeGreaterThan(0);
  });
});

// ─── BPlusTree ───

describe("BPlusTree", () => {
  it("插入并产生正确的树结构", () => {
    const r = exec(`BPlusTree tree(3);
tree.insert(10, 20, 30, 40, 50);`);
    expect(r.errors).toHaveLength(0);
    const tree = getTree(r);
    expect(Object.keys(tree.nodes).length).toBeGreaterThan(0);
  });

  it("搜索操作", () => {
    const r = exec(`BPlusTree tree(3);
tree.insert(10, 20, 30);
tree.search(20);`);
    expect(r.errors).toHaveLength(0);
  });
});

// ─── Trie ───

describe("Trie", () => {
  it("插入单词并产生节点", () => {
    const r = exec(`Trie trie;
trie.insert("abc");
trie.insert("abd");`);

    expect(r.errors).toHaveLength(0);
    const tree = getTree(r);
    expect(Object.keys(tree.nodes).length).toBeGreaterThanOrEqual(4);
  });

  it("搜索存在的单词", () => {
    const r = exec(`Trie trie;
trie.insert("hello");
trie.search("hello");`);
    expect(r.errors).toHaveLength(0);
  });

  it("搜索不存在的单词", () => {
    const r = exec(`Trie trie;
trie.insert("cat");
trie.search("car");`);
    expect(r.errors).toHaveLength(0);
  });
});

// ─── TwoThreeTree ───

describe("TwoThreeTree", () => {
  it("多参数插入", () => {
    const r = exec(`TwoThreeTree tree;
tree.insert(10, 20, 30, 40, 50);`);
    expect(r.errors).toHaveLength(0);
    const tree = getTree(r);
    expect(Object.keys(tree.nodes).length).toBeGreaterThan(0);
  });

  it("删除操作", () => {
    const r = exec(`TwoThreeTree tree;
tree.insert(10, 20, 30, 40, 50);
tree.delete(30);`);
    expect(r.errors).toHaveLength(0);
  });
});

// ─── SkipList ───

describe("SkipList", () => {
  it("插入多个值", () => {
    const r = exec(`SkipList list;
list.insert(3);
list.insert(7);
list.insert(1);
list.insert(9);`);

    expect(r.errors).toHaveLength(0);
    const struct = getLastStruct<"multiarray">(r, "multiarray");
    expect(struct.arrays.length).toBeGreaterThan(0);
  });

  it("搜索操作", () => {
    const r = exec(`SkipList list;
list.insert(5);
list.insert(10);
list.insert(15);
list.search(10);`);
    expect(r.errors).toHaveLength(0);
  });
});

// ─── Huffman ───

describe("Huffman", () => {
  it("根据频率建树", () => {
    const r = exec(`Huffman h;
h.build(5, 9, 12, 13, 16, 45);`);
    expect(r.errors).toHaveLength(0);
    const tree = getTree(r);
    expect(Object.keys(tree.nodes).length).toBeGreaterThan(0);
  });
});
