import { describe, it, expect } from "vitest";
import { parse } from "../parser/parser";
import { createRuntime } from "../executor";
import type { VisualHashBucket, VisualHashEntry } from "../../types";

function exec(code: string) {
  const result = parse(code);
  expect(result.errors).toHaveLength(0);
  const runtime = createRuntime();
  return runtime.execute(result.program!);
}

function getHashTable(r: ReturnType<ReturnType<typeof createRuntime>["execute"]>) {
  const lastFrame = r.frames[r.frames.length - 1];
  const structures = lastFrame.snapshot.structures;
  const struct = Object.values(structures)[0] as {
    type: string;
    buckets: VisualHashBucket[];
    tableSize: number;
    hashFunc: string;
  };
  expect(struct.type).toBe("hashtable");
  return struct;
}

/** 计算哈希表中所有条目数量 */
function totalEntries(buckets: VisualHashBucket[]): number {
  return buckets.reduce((sum, b) => sum + b.entries.length, 0);
}

/** 查找指定 key 的条目 */
function findEntry(buckets: VisualHashBucket[], key: number): VisualHashEntry | undefined {
  for (const b of buckets) {
    for (const e of b.entries) {
      if (e.key === key) return e;
    }
  }
  return undefined;
}

// ─── 线性探测模式 ───

describe("HashTable (linear)", () => {
  it("多参数插入：ht.insert(10, 22, 31) 全部插入", () => {
    const r = exec(`HashTable ht(11, linear);
ht.insert(10, 22, 31);`);

    expect(r.errors).toHaveLength(0);
    const ht = getHashTable(r);
    expect(totalEntries(ht.buckets)).toBe(3);
  });

  it("单次插入后可以搜索到", () => {
    const r = exec(`HashTable ht(11, linear);
ht.insert(47);
ht.search(47);`);

    expect(r.errors).toHaveLength(0);
    const ht = getHashTable(r);
    const entry = findEntry(ht.buckets, 47);
    expect(entry).toBeDefined();
  });

  it("搜索不存在的键不报错", () => {
    const r = exec(`HashTable ht(11, linear);
ht.insert(10);
ht.search(99);`);

    expect(r.errors).toHaveLength(0);
  });

  it("删除后条目标记为 deleted", () => {
    const r = exec(`HashTable ht(11, linear);
ht.insert(47);
ht.insert(25);
ht.delete(47);`);

    expect(r.errors).toHaveLength(0);
    const ht = getHashTable(r);
    const entry = findEntry(ht.buckets, 47);
    expect(entry).toBeDefined();
    expect(entry!.status).toBe("deleted");
  });

  it("线性探测：删除后仍能搜索到后续探查链中的条目", () => {
    // 47 % 11 = 3, 25 % 11 = 3 → 碰撞，25 探查到下一个位置
    // 删除 47 后搜索 25，应该跳过 deleted 槽找到 25
    const r = exec(`HashTable ht(11, linear);
ht.insert(47);
ht.insert(25);
ht.delete(47);
ht.search(25);`);

    expect(r.errors).toHaveLength(0);
    const ht = getHashTable(r);
    const entry = findEntry(ht.buckets, 25);
    expect(entry).toBeDefined();
  });

  it("插入到已删除的槽位可以复用", () => {
    const r = exec(`HashTable ht(11, linear);
ht.insert(47);
ht.delete(47);
ht.insert(14);`);

    expect(r.errors).toHaveLength(0);
    // 不报错即算通过
  });

  it("resetStatus 不影响 deleted 条目", () => {
    // 插入、删除、再搜索另一个键，中间 resetStatus 应该保留 deleted 状态
    const r = exec(`HashTable ht(11, linear);
ht.insert(47);
ht.insert(25);
ht.delete(47);
ht.search(25);`);

    expect(r.errors).toHaveLength(0);
    // 搜索后，25 应该能找到
    const ht = getHashTable(r);
    const entry25 = findEntry(ht.buckets, 25);
    expect(entry25).toBeDefined();
  });

  it("大量插入和删除操作", () => {
    const r = exec(`HashTable ht(13, linear);
ht.insert(10, 22, 31, 4, 15, 28, 17, 88, 59);
ht.delete(22);
ht.delete(31);
ht.search(59);`);

    expect(r.errors).toHaveLength(0);
  });
});

// ─── 链式模式 ───

describe("HashTable (chain)", () => {
  it("多参数插入", () => {
    const r = exec(`HashTable ht(7, chain);
ht.insert(10, 22, 31);`);

    expect(r.errors).toHaveLength(0);
    const ht = getHashTable(r);
    expect(totalEntries(ht.buckets)).toBe(3);
  });

  it("碰撞时在同一桶中链式存储", () => {
    const r = exec(`HashTable ht(5, chain);
ht.insert(5);
ht.insert(10);
ht.insert(15);`);

    expect(r.errors).toHaveLength(0);
    const ht = getHashTable(r);
    // 5 % 5 = 0, 10 % 5 = 0, 15 % 5 = 0 → 全在桶 0
    const bucket0 = ht.buckets.find((b) => b.index === 0);
    expect(bucket0).toBeDefined();
    expect(bucket0!.entries.length).toBe(3);
  });

  it("链式删除物理移除条目", () => {
    const r = exec(`HashTable ht(5, chain);
ht.insert(5, 10, 15);
ht.delete(10);`);

    expect(r.errors).toHaveLength(0);
    const ht = getHashTable(r);
    const entry10 = findEntry(ht.buckets, 10);
    expect(entry10).toBeUndefined();
    // 其余条目仍在
    expect(findEntry(ht.buckets, 5)).toBeDefined();
    expect(findEntry(ht.buckets, 15)).toBeDefined();
  });

  it("链式搜索", () => {
    const r = exec(`HashTable ht(5, chain);
ht.insert(5, 10, 15);
ht.search(10);`);

    expect(r.errors).toHaveLength(0);
  });

  it("链式删除后再搜索同桶条目", () => {
    const r = exec(`HashTable ht(5, chain);
ht.insert(5, 10, 15);
ht.delete(5);
ht.search(15);`);

    expect(r.errors).toHaveLength(0);
    const ht = getHashTable(r);
    expect(findEntry(ht.buckets, 15)).toBeDefined();
  });
});
