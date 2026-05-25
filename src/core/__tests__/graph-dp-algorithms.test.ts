import { describe, it, expect } from "vitest";
import { parse } from "../parser/parser";
import { createRuntime } from "../executor";

function exec(code: string) {
  const result = parse(code);
  expect(result.errors).toHaveLength(0);
  const runtime = createRuntime();
  return runtime.execute(result.program!);
}

// ─── 图算法 ───

describe("Graph", () => {
  const basicGraph = `Graph g(5);
g.addEdge(0, 1, 10);
g.addEdge(0, 2, 5);
g.addEdge(1, 2, 2);
g.addEdge(1, 3, 1);
g.addEdge(2, 1, 3);
g.addEdge(2, 3, 9);
g.addEdge(2, 4, 2);
g.addEdge(3, 4, 4);
g.addEdge(4, 3, 6);`;

  it("Dijkstra 最短路径", () => {
    const r = exec(`${basicGraph}
g.dijkstra(0);`);
    expect(r.errors).toHaveLength(0);
    expect(r.frames.length).toBeGreaterThan(0);
  });

  it("BFS 广度优先搜索", () => {
    const r = exec(`Graph g(4);
g.addEdge(0, 1, 1);
g.addEdge(0, 2, 1);
g.addEdge(1, 3, 1);
g.addEdge(2, 3, 1);
g.bfs(0);`);
    expect(r.errors).toHaveLength(0);
    expect(r.frames.length).toBeGreaterThan(0);
  });

  it("DFS 深度优先搜索", () => {
    const r = exec(`Graph g(4);
g.addEdge(0, 1, 1);
g.addEdge(0, 2, 1);
g.addEdge(1, 3, 1);
g.dfs(0);`);
    expect(r.errors).toHaveLength(0);
    expect(r.frames.length).toBeGreaterThan(0);
  });

  it("Prim 最小生成树", () => {
    const r = exec(`Graph g(4);
g.addEdge(0, 1, 1);
g.addEdge(0, 2, 3);
g.addEdge(1, 2, 1);
g.addEdge(1, 3, 4);
g.addEdge(2, 3, 1);
g.prim(0);`);
    expect(r.errors).toHaveLength(0);
  });

  it("Prim 不连通图检测", () => {
    const r = exec(`Graph g(4);
g.addEdge(0, 1, 1);
g.addEdge(2, 3, 1);
g.prim(0);`);
    expect(r.errors).toHaveLength(0);
    // 应该有帧报告不连通
    expect(r.frames.length).toBeGreaterThan(0);
  });

  it("Kruskal 最小生成树", () => {
    const r = exec(`Graph g(4);
g.addEdge(0, 1, 1);
g.addEdge(0, 2, 3);
g.addEdge(1, 2, 1);
g.addEdge(1, 3, 4);
g.addEdge(2, 3, 1);
g.kruskal();`);
    expect(r.errors).toHaveLength(0);
  });

  it("拓扑排序", () => {
    const r = exec(`Graph g(6);
g.addEdge(5, 0, 1);
g.addEdge(5, 2, 1);
g.addEdge(4, 0, 1);
g.addEdge(4, 1, 1);
g.addEdge(2, 3, 1);
g.addEdge(3, 1, 1);
g.topoSort();`);
    expect(r.errors).toHaveLength(0);
  });

  it("Floyd 最短路径", () => {
    const r = exec(`Graph g(4);
g.addEdge(0, 1, 5);
g.addEdge(0, 3, 10);
g.addEdge(1, 2, 3);
g.addEdge(2, 3, 1);
g.floyd();`);
    expect(r.errors).toHaveLength(0);
  });

  it("关键路径（无环）", () => {
    const r = exec(`Graph g(6);
g.addEdge(0, 1, 3);
g.addEdge(0, 2, 2);
g.addEdge(1, 3, 4);
g.addEdge(2, 3, 3);
g.addEdge(3, 4, 2);
g.addEdge(3, 5, 1);
g.criticalPath();`);
    expect(r.errors).toHaveLength(0);
  });

  it("关键路径（有环检测）", () => {
    const r = exec(`Graph g(3);
g.addEdge(0, 1, 1);
g.addEdge(1, 2, 1);
g.addEdge(2, 0, 1);
g.criticalPath();`);
    expect(r.errors).toHaveLength(0);
    // 应检测到环
    expect(r.frames.length).toBeGreaterThan(0);
  });

  it("Bellman-Ford 最短路径", () => {
    const r = exec(`Graph g(4);
g.addEdge(0, 1, 4);
g.addEdge(0, 2, 5);
g.addEdge(1, 2, -3);
g.addEdge(2, 3, 4);
g.bellmanFord(0);`);
    expect(r.errors).toHaveLength(0);
  });

  it("Tarjan 强连通分量", () => {
    const r = exec(`Graph g(5);
g.addEdge(0, 2, 1);
g.addEdge(1, 0, 1);
g.addEdge(2, 1, 1);
g.addEdge(0, 3, 1);
g.addEdge(3, 4, 1);
g.tarjan();`);
    expect(r.errors).toHaveLength(0);
    expect(r.frames.length).toBeGreaterThan(0);
  });

  it("Kosaraju 强连通分量", () => {
    const r = exec(`Graph g(5);
g.addEdge(0, 2, 1);
g.addEdge(1, 0, 1);
g.addEdge(2, 1, 1);
g.addEdge(0, 3, 1);
g.addEdge(3, 4, 1);
g.kosaraju();`);
    expect(r.errors).toHaveLength(0);
    expect(r.frames.length).toBeGreaterThan(0);
  });

  it("图着色", () => {
    const r = exec(`Graph g(4);
g.addEdge(0, 1, 1);
g.addEdge(0, 2, 1);
g.addEdge(1, 2, 1);
g.addEdge(1, 3, 1);
g.addEdge(2, 3, 1);
g.graphColoring();`);
    expect(r.errors).toHaveLength(0);
    expect(r.frames.length).toBeGreaterThan(0);
  });
});

// ─── DP 算法 ───

describe("Knapsack (0-1 背包)", () => {
  it("基本求解", () => {
    const r = exec(`Knapsack ks;
ks.solve(10, 2, 3, 4, 5, 6);`);
    expect(r.errors).toHaveLength(0);
    expect(r.frames.length).toBeGreaterThan(0);
  });
});

describe("LCS 最长公共子序列", () => {
  it("基本求解", () => {
    const r = exec(`LCS l;
l.solve("ABCBDAB", "BDCAB");`);
    expect(r.errors).toHaveLength(0);
    expect(r.frames.length).toBeGreaterThan(0);
  });

  it("空字符串", () => {
    const r = exec(`LCS l;
l.solve("", "abc");`);
    expect(r.errors).toHaveLength(0);
  });
});

describe("EditDistance 编辑距离", () => {
  it("基本求解", () => {
    const r = exec(`EditDistance ed;
ed.solve("kitten", "sitting");`);
    expect(r.errors).toHaveLength(0);
    expect(r.frames.length).toBeGreaterThan(0);
  });

  it("相同字符串", () => {
    const r = exec(`EditDistance ed;
ed.solve("abc", "abc");`);
    expect(r.errors).toHaveLength(0);
  });
});

describe("MatrixChain 矩阵链乘", () => {
  it("基本求解", () => {
    const r = exec(`MatrixChain mc;
mc.solve(10, 30, 5, 60);`);
    expect(r.errors).toHaveLength(0);
    expect(r.frames.length).toBeGreaterThan(0);
  });
});

describe("LIS 最长递增子序列", () => {
  it("基本求解", () => {
    const r = exec(`LIS lis;
lis.solve(10, 9, 2, 5, 3, 7, 101, 18);`);
    expect(r.errors).toHaveLength(0);
    expect(r.frames.length).toBeGreaterThan(0);
  });

  it("单元素", () => {
    const r = exec(`LIS lis;
lis.solve(5);`);
    expect(r.errors).toHaveLength(0);
  });
});
