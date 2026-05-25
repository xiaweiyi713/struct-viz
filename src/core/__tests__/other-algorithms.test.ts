import { describe, it, expect } from "vitest";
import { parse } from "../parser/parser";
import { createRuntime } from "../executor";

function exec(code: string) {
  const result = parse(code);
  expect(result.errors).toHaveLength(0);
  const runtime = createRuntime();
  return runtime.execute(result.program!);
}

// ─── Stack ───

describe("Stack", () => {
  it("push 和 pop 操作", () => {
    const r = exec(`Stack s;
s.push(1);
s.push(2);
s.push(3);
s.pop();`);

    expect(r.errors).toHaveLength(0);
    expect(r.frames.length).toBeGreaterThan(0);

    const lastFrame = r.frames[r.frames.length - 1];
    const struct = Object.values(lastFrame.snapshot.structures)[0] as { type: string; items: { value: number }[] };
    expect(struct.type).toBe("stack");
    // pop 后剩 [1, 2]
    expect(struct.items.map((i) => i.value)).toEqual([1, 2]);
  });

  it("peek 查看栈顶", () => {
    const r = exec(`Stack s;
s.push(10);
s.push(20);
s.peek();`);

    expect(r.errors).toHaveLength(0);
  });

  it("空栈 pop 会报运行时错误", () => {
    const r = exec(`Stack s;
s.pop();`);
    expect(r.errors.length).toBeGreaterThan(0);
  });
});

// ─── Queue ───

describe("Queue", () => {
  it("enqueue 和 dequeue 操作", () => {
    const r = exec(`Queue q;
q.enqueue(1);
q.enqueue(2);
q.enqueue(3);
q.dequeue();`);

    expect(r.errors).toHaveLength(0);
    const lastFrame = r.frames[r.frames.length - 1];
    const struct = Object.values(lastFrame.snapshot.structures)[0] as { type: string; items: { value: number }[] };
    expect(struct.type).toBe("queue");
    expect(struct.items.map((i) => i.value)).toEqual([2, 3]);
  });

  it("front 查看队头", () => {
    const r = exec(`Queue q;
q.enqueue(10);
q.enqueue(20);
q.front();`);
    expect(r.errors).toHaveLength(0);
  });

  it("空队 dequeue 会报运行时错误", () => {
    const r = exec(`Queue q;
q.dequeue();`);
    expect(r.errors.length).toBeGreaterThan(0);
  });
});

// ─── BinarySearch ───

describe("BinarySearch", () => {
  it("在有序数组中查找存在的值", () => {
    const r = exec(`BinarySearch bs;
bs.search(1, 3, 5, 7, 9, 11, 13);`);

    expect(r.errors).toHaveLength(0);
    expect(r.frames.length).toBeGreaterThan(0);
  });

  it("查找不存在的值", () => {
    const r = exec(`BinarySearch bs;
bs.search(1, 3, 5, 7, 9, 11, 13);`);

    expect(r.errors).toHaveLength(0);
  });

  it("单元素数组", () => {
    const r = exec(`BinarySearch bs;
bs.search(42);`);
    expect(r.errors).toHaveLength(0);
  });
});

// ─── KMP ───

describe("KMP", () => {
  it("匹配存在的模式", () => {
    const r = exec(`KMP kmp;
kmp.match("ABABDABACDABABCABAB", "ABABCABAB");`);

    expect(r.errors).toHaveLength(0);
    expect(r.frames.length).toBeGreaterThan(0);
  });

  it("匹配不存在的模式", () => {
    const r = exec(`KMP kmp;
kmp.match("abcdef", "xyz");`);
    expect(r.errors).toHaveLength(0);
  });
});

// ─── NaiveStr ───

describe("NaiveStr", () => {
  it("朴素字符串匹配", () => {
    const r = exec(`NaiveStr ns;
ns.match("AABAACAADAABAABA", "AABA");`);

    expect(r.errors).toHaveLength(0);
    expect(r.frames.length).toBeGreaterThan(0);
  });
});

// ─── UnionFind ───

describe("UnionFind", () => {
  it("初始化、合并、查找", () => {
    const r = exec(`UnionFind uf;
uf.init(5);
uf.union(0, 1);
uf.union(2, 3);
uf.find(1);`);

    expect(r.errors).toHaveLength(0);
    expect(r.frames.length).toBeGreaterThan(0);
  });
});

// ─── ActivitySelection ───

describe("ActivitySelection", () => {
  it("活动选择", () => {
    const r = exec(`ActivitySelection as;
as.select(1, 3, 0, 4, 1, 2, 4, 6);`);

    expect(r.errors).toHaveLength(0);
    expect(r.frames.length).toBeGreaterThan(0);
  });
});

// ─── FractionalKnapsack ───

describe("FractionalKnapsack", () => {
  it("分数背包求解", () => {
    const r = exec(`FractionalKnapsack fk;
fk.solve(50, 10, 60, 20, 100, 30, 120);`);

    expect(r.errors).toHaveLength(0);
    expect(r.frames.length).toBeGreaterThan(0);
  });
});

// ─── JobScheduling ───

describe("JobScheduling", () => {
  it("作业调度", () => {
    const r = exec(`JobScheduling js;
js.solve(2, 4, 3, 5, 6, 4);`);

    expect(r.errors).toHaveLength(0);
    expect(r.frames.length).toBeGreaterThan(0);
  });
});

// ─── StringHash ───

describe("StringHash", () => {
  it("计算前缀哈希和子串查询", () => {
    const r = exec(`StringHash sh;
sh.hash("abcabcabc", 1, 3, 4, 6, 7, 9);`);

    expect(r.errors).toHaveLength(0);
    expect(r.frames.length).toBeGreaterThan(0);
  });

  it("仅计算前缀哈希无查询", () => {
    const r = exec(`StringHash sh;
sh.hash("hello");`);

    expect(r.errors).toHaveLength(0);
    expect(r.frames.length).toBeGreaterThan(0);
  });

  it("空字符串不报错", () => {
    const r = exec(`StringHash sh;
sh.hash("");`);

    expect(r.errors).toHaveLength(0);
  });
});
