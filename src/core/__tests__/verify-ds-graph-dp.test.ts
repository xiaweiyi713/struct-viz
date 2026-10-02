/**
* verify-ds-graph-dp.test.ts
*
* 数据结构（图算法）+ 动态规划 19 个模板的正确性验证。
*
* 方法：从 src/data/templates.ts 取出每个模板的精确 code，用 parser.parse()
* 解析、createRuntime().execute() 执行（与线上 Worker 同一套管线），然后
* 对照的期望值断言（手算 / 自写参考实现，见文件内注释）。
*
* 约束：本文件只做验证，不修改任何源码。发现疑似 bug 只断言失败并在报告中说明。
*/
import { describe, it, expect} from "vitest";
import { parse} from "../parser/parser";
import { createRuntime} from "../executor";
import { getTemplateById} from "../../data/templates";
import type {
TraceEvent,
TraceFrame,
RuntimeValue,
VisualGraphNode,
VisualGraphEdge,
} from "../../types";

type ExecResult = ReturnType<ReturnType<typeof createRuntime>["execute"]>;
type GraphStruct = {
type: "graph";
nodes: Record<string, VisualGraphNode>;
edges: Record<string, VisualGraphEdge>;
};

// ── 通用 helper ──────────────────────────────────────────────

/** 执行一个模板：parse 无错、execute 无错、frames 非空 */
function runTemplate(id: string): ExecResult {
const tpl = getTemplateById(id);
expect(tpl, `template ${id} 不存在`).toBeDefined();
const parsed = parse(tpl!.code);
expect(parsed.errors, `${id} parse errors: ${JSON.stringify(parsed.errors)}`).toHaveLength(0);
expect(parsed.program, `${id} program 为空`).toBeDefined();
const result = createRuntime().execute(parsed.program!);
expect(result.errors, `${id} runtime errors: ${JSON.stringify(result.errors)}`).toHaveLength(0);
expect(result.frames.length, `${id} frames 为空`).toBeGreaterThan(0);
return result;
}

function lastFrame(r: ExecResult): TraceFrame {
return r.frames[r.frames.length - 1];
}

/** 取最后一帧的图结构（变量名 g） */
function graphOf(r: ExecResult): GraphStruct {
const s = lastFrame(r).snapshot.structures["g"];
expect(s?.type, "最后一帧没有 graph 结构").toBe("graph");
return s as GraphStruct;
}

/** 取最后一帧的图变量 g.<key>（如 g.dist / g.visited） */
function gvar(r: ExecResult, key: string): RuntimeValue {
const v = lastFrame(r).snapshot.variables?.[`g.${key}`];
expect(v, `变量 g.${key} 不存在`).toBeDefined();
return v!;
}

function strArray(v: RuntimeValue): string[] {
expect(v.type).toBe("array");
return v.value as string[];
}

function eventsOf(r: ExecResult, type: TraceEvent["type"]): TraceEvent[] {
return r.frames.map((f) => f.event).filter((e) => e.type === type);
}

/** 最后一个 MARK_FINAL 事件（各算法把最终结论放在这里） */
function lastFinal(r: ExecResult): TraceEvent {
const fs = eventsOf(r, "MARK_FINAL");
expect(fs.length, "没有 MARK_FINAL 事件").toBeGreaterThan(0);
return fs[fs.length - 1];
}

/** payload 取值（无 payload 时抛错，便于定位） */
function payloadOf(e: TraceEvent): Record<string, unknown> {
expect(e.payload, `事件 "${e.title}" 没有 payload`).toBeDefined();
return e.payload as Record<string, unknown>;
}

// ── 独立参考实现（手写，仅用于推导/交叉验证期望，不复制 runtime 逻辑） ──

type Edge = [number, number, number]; // [from, to, weight]

function refDijkstra(n: number, edges: Edge[], src: number): number[] {
const dist = Array(n).fill(Infinity);
const done = Array(n).fill(false);
const adj: [number, number][][] = Array.from({ length: n}, () => []);
for (const [u, v, w] of edges) adj[u].push([v, w]);
dist[src] = 0;
for (let i = 0; i < n; i++) {
let u = -1;
for (let j = 0; j < n; j++)
if (!done[j] && (u === -1 || dist[j] < dist[u])) u = j;
if (u === -1 || dist[u] === Infinity) break;
done[u] = true;
for (const [v, w] of adj[u]) if (dist[u] + w < dist[v]) dist[v] = dist[u] + w;
}
return dist;
}

function refBFS(n: number, edges: Edge[], src: number): number[] {
const adj: number[][] = Array.from({ length: n}, () => []);
for (const [u, v] of edges) adj[u].push(v); // 插入顺序即邻接顺序
const order: number[] = [];
const seen = new Set([src]);
const q = [src];
while (q.length) {
const u = q.shift()!;
order.push(u);
for (const v of adj[u]) if (!seen.has(v)) { seen.add(v); q.push(v);}
}
return order;
}

function refDFS(n: number, edges: Edge[], src: number): number[] {
const adj: number[][] = Array.from({ length: n}, () => []);
for (const [u, v] of edges) adj[u].push(v);
const order: number[] = [];
const seen = new Set<number>();
const dfs = (u: number) => {
seen.add(u); order.push(u);
for (const v of adj[u]) if (!seen.has(v)) dfs(v);
};
dfs(src);
return order;
}

/** 无向图 Kruskal 求 MST 权重（独立参考） */
function refKruskalWeight(n: number, edges: Edge[]): number {
const parent = Array.from({ length: n}, (_, i) => i);
const find = (x: number): number => (parent[x] === x? x: (parent[x] = find(parent[x])));
let total = 0, cnt = 0;
for (const [u, v, w] of [...edges].sort((a, b) => a[2] - b[2])) {
const ru = find(u), rv = find(v);
if (ru!== rv) { parent[ru] = rv; total += w; cnt++;}
}
expect(cnt, "参考 Kruskal 未连通").toBe(n - 1);
return total;
}

function refFloyd(n: number, edges: Edge[]): number[][] {
const d: number[][] = Array.from({ length: n}, (_, i) =>
Array.from({ length: n}, (_, j) => (i === j? 0: Infinity)),
);
for (const [u, v, w] of edges) d[u][v] = Math.min(d[u][v], w);
for (let k = 0; k < n; k++)
for (let i = 0; i < n; i++)
for (let j = 0; j < n; j++)
if (d[i][k] + d[k][j] < d[i][j]) d[i][j] = d[i][k] + d[k][j];
return d;
}

function refBellmanFord(n: number, edges: Edge[], src: number): number[] {
const d = Array(n).fill(Infinity);
d[src] = 0;
for (let i = 0; i < n - 1; i++)
for (const [u, v, w] of edges)
if (d[u]!== Infinity && d[u] + w < d[v]) d[v] = d[u] + w;
return d;
}

/** 验证 order 是否为合法拓扑序 */
function isTopoOrder(order: number[], edges: Edge[]): boolean {
if (order.length!== new Set(order).size) return false;
const pos = new Map(order.map((v, i) => [v, i]));
return edges.every(([u, v]) => pos.get(u)! < pos.get(v)!);
}

/** 验证 path 是否为合法欧拉路径（无向意义下每条边恰用一次） */
function isEulerPath(path: number[], edges: Edge[]): boolean {
if (path.length!== edges.length + 1) return false;
const unused = edges.map((_, i) => i);
const key = (a: number, b: number) => (a < b? `${a}-${b}`: `${b}-${a}`);
const pool = new Map<string, number[]>();
for (const i of unused) {
const k = key(edges[i][0], edges[i][1]);
if (!pool.has(k)) pool.set(k, []);
pool.get(k)!.push(i);
}
for (let i = 0; i < path.length - 1; i++) {
const k = key(path[i], path[i + 1]);
const lst = pool.get(k);
if (!lst || lst.length === 0) return false;
lst.pop();
}
return [...pool.values()].every((l) => l.length === 0);
}

/** 0/1 背包暴力参考（子集枚举） */
function refKnapsackBrute(items: [number, number][], W: number): number {
let best = 0;
for (let mask = 0; mask < 1 << items.length; mask++) {
let w = 0, v = 0;
for (let i = 0; i < items.length; i++)
if (mask & (1 << i)) { w += items[i][0]; v += items[i][1];}
if (w <= W && v > best) best = v;
}
return best;
}

function refLCS(a: string, b: string): number {
const dp: number[][] = Array.from({ length: a.length + 1}, () =>
Array(b.length + 1).fill(0),
);
for (let i = 1; i <= a.length; i++)
for (let j = 1; j <= b.length; j++)
dp[i][j] = a[i - 1] === b[j - 1]? dp[i - 1][j - 1] + 1: Math.max(dp[i - 1][j], dp[i][j - 1]);
return dp[a.length][b.length];
}

function refEditDistance(a: string, b: string): number {
const dp: number[][] = Array.from({ length: a.length + 1}, (_, i) =>
Array.from({ length: b.length + 1}, (_, j) => (i === 0? j: j === 0? i: 0)),
);
for (let i = 1; i <= a.length; i++)
for (let j = 1; j <= b.length; j++)
dp[i][j] = Math.min(
dp[i - 1][j] + 1,
dp[i][j - 1] + 1,
dp[i - 1][j - 1] + (a[i - 1] === b[j - 1]? 0: 1),
);
return dp[a.length][b.length];
}

function refMatrixChain(p: number[]): number {
const n = p.length - 1;
const dp: number[][] = Array.from({ length: n + 2}, () => Array(n + 2).fill(0));
for (let len = 2; len <= n; len++)
for (let i = 1; i <= n - len + 1; i++) {
const j = i + len - 1;
dp[i][j] = Infinity;
for (let k = i; k < j; k++)
dp[i][j] = Math.min(dp[i][j], dp[i][k] + dp[k + 1][j] + p[i - 1] * p[k] * p[j]);
}
return dp[1][n];
}

function refLIS(a: number[]): number {
const dp = Array(a.length).fill(1);
for (let i = 0; i < a.length; i++)
for (let j = 0; j < i; j++)
if (a[j] < a[i]) dp[i] = Math.max(dp[i], dp[j] + 1);
return Math.max(...dp);
}

/** 从 "SCC1={2, 1, 0}, SCC2={3}" 解析出数字集合数组 */
function parseSCCs(desc: string): number[][] {
const out: number[][] = [];
for (const m of desc.matchAll(/SCC\d+=\{([^}]*)\}/g)) {
out.push(
m[1].split(",").map((s) => Number(s.trim())).filter((x) =>!Number.isNaN(x)).sort((a, b) => a - b),
);
}
return out.sort((a, b) => a[0] - b[0]);
}

// ── 图算法验证 ─────────────────────────────────────────────

describe("图算法模板验证", () => {
it("dijkstra: 单源最短路", () => {
const r = runTemplate("dijkstra");
// 模板图: 0→1:10, 0→2:3, 2→1:1, 1→3:2, 2→3:8, 3→4:4, 源点 0
// 手算: d0=0; d2=3; d1=min(10,3+1)=4; d3=min(11,4+2)=6; d4=6+4=10
const edges: Edge[] = [[0,1,10],[0,2,3],[2,1,1],[1,3,2],[2,3,8],[3,4,4]];
expect(refDijkstra(5, edges, 0)).toEqual([0, 4, 3, 6, 10]); // 参考实现交叉验证手算
const dist = strArray(gvar(r, "dist"));
expect(dist).toEqual(["0:0", "1:4", "2:3", "3:6", "4:10"]);
// 所有节点都应被访问
expect(strArray(gvar(r, "visited")).sort()).toEqual(["0","1","2","3","4"]);
});

it("graph-bfs: 广度优先遍历", () => {
const r = runTemplate("graph-bfs");
// 模板图邻接(插入顺序): 0:[1,2] 1:[3,4] 2:[4] 3:[5] 4:[5]
// 手算 BFS(队列): 0 → 1,2 → 3,4 → 5
const edges: Edge[] = [[0,1,1],[0,2,1],[1,3,1],[1,4,1],[2,4,1],[3,5,1],[4,5,1]];
expect(refBFS(6, edges, 0)).toEqual([0, 1, 2, 3, 4, 5]);
const g = graphOf(r);
const order = eventsOf(r, "DEQUEUE").map((e) => g.nodes[e.targets![0]].label);
expect(order).toEqual(["0", "1", "2", "3", "4", "5"]);
});

it("graph-dfs: 深度优先遍历", () => {
const r = runTemplate("graph-dfs");
// 手算 DFS(递归,邻接插入顺序): 0→1→3→5,回溯→4,回溯→2
const edges: Edge[] = [[0,1,1],[0,2,1],[1,3,1],[1,4,1],[2,4,1],[3,5,1],[4,5,1]];
expect(refDFS(6, edges, 0)).toEqual([0, 1, 3, 5, 4, 2]);
const g = graphOf(r);
const order = eventsOf(r, "VISIT_NODE")
.filter((e) => e.title.startsWith("访问节点"))
.map((e) => g.nodes[e.targets![0]].label);
expect(order).toEqual(["0", "1", "3", "5", "4", "2"]);
});

it("graph-prim: Prim 最小生成树", () => {
const r = runTemplate("graph-prim");
// 模板 10 条边(无向意义): (0,1,6)(0,2,1)(0,3,5)(1,2,5)(1,4,3)(2,3,5)(2,4,6)(2,5,4)(3,5,2)(4,5,6)
// 手算 Kruskal: 取(0,2,1)(3,5,2)(1,4,3)(2,5,4)(1,2,5), 总权重=1+2+3+4+5=15
const edges: Edge[] = [[0,1,6],[0,2,1],[0,3,5],[1,2,5],[1,4,3],[2,3,5],[2,4,6],[2,5,4],[3,5,2],[4,5,6]];
expect(refKruskalWeight(6, edges)).toBe(15); // 独立参考实现给出 MST=15
const evt = lastFinal(r);
expect(evt.title).toBe("Prim MST 构建完成");
// 6 个节点 MST 应恰为 5 条边、总权重 15
expect(payloadOf(evt).totalWeight).toBe(15);
expect(evt.targets).toHaveLength(5);
});

it("graph-kruskal: Kruskal 最小生成树", () => {
const r = runTemplate("graph-kruskal");
const edges: Edge[] = [[0,1,6],[0,2,1],[0,3,5],[1,2,5],[1,4,3],[2,3,5],[2,4,6],[2,5,4],[3,5,2],[4,5,6]];
expect(refKruskalWeight(6, edges)).toBe(15);
const evt = lastFinal(r);
expect(evt.title).toBe("Kruskal MST 构建完成");
const p = payloadOf(evt);
expect(p.totalWeight).toBe(15);
expect(p.edgeCount).toBe(5);
});

it("graph-topo: 拓扑排序", () => {
const r = runTemplate("graph-topo");
const edges: Edge[] = [[0,1,1],[0,2,1],[1,3,1],[2,3,1],[2,4,1],[3,5,1],[4,5,1]];
const g = graphOf(r);
const order = eventsOf(r, "DEQUEUE").map((e) => Number(g.nodes[e.targets![0]].label));
expect(order).toHaveLength(6);
// 正确性标准: 合法拓扑序(每条边 u→v 都有 u 在 v 之前)
expect(isTopoOrder(order, edges)).toBe(true);
});

it("graph-floyd: Floyd 所有点对最短路", () => {
const r = runTemplate("graph-floyd");
// 模板图: 0→1:4, 0→2:6, 1→2:1, 1→3:5, 2→3:2
// 手算: d[0]=[0,4,5,7], d[1]=[∞,0,1,3], d[2]=[∞,∞,0,2], d[3]=[∞,∞,∞,0]
const edges: Edge[] = [[0,1,4],[0,2,6],[1,2,1],[1,3,5],[2,3,2]];
const expected = refFloyd(4, edges);
expect(expected).toEqual([[0,4,5,7],[Infinity,0,1,3],[Infinity,Infinity,0,2],[Infinity,Infinity,Infinity,0]]);
// 从 UPDATE_DISTANCE 事件重放最终距离矩阵
const INF = Infinity;
const got: number[][] = Array.from({ length: 4}, (_, i) =>
Array.from({ length: 4}, (_, j) => (i === j? 0: INF)),
);
for (const [u, v, w] of edges) got[u][v] = Math.min(got[u][v], w);
for (const e of eventsOf(r, "UPDATE_DISTANCE")) {
const m = e.title.match(/d\[(\d+)\]\[(\d+)\] =.* -> (∞|\d+)/);
expect(m, `无法解析事件: ${e.title}`).not.toBeNull();
got[Number(m![1])][Number(m![2])] = m![3] === "∞"? INF: Number(m![3]);
}
expect(got).toEqual(expected);
});

it("graph-critical: 关键路径(AOE)", () => {
const r = runTemplate("graph-critical");
// 手算 ve: [0,3,2,6,6,8]; vl: [0,4,2,6,7,8]; 总工期 8; 关键活动: 0→2,2→3,3→5
const evt = lastFinal(r);
expect(evt.title).toBe("关键路径计算完成");
const p = payloadOf(evt);
expect(p.totalDuration).toBe(8);
expect(p.ve).toEqual({ v0: 0, v1: 3, v2: 2, v3: 6, v4: 6, v5: 8});
expect(p.vl).toEqual({ v0: 0, v1: 4, v2: 2, v3: 6, v4: 7, v5: 8});
// 关键边应为 3 条: (0,2),(2,3),(3,5)
const g = graphOf(r);
const critical = Object.values(g.edges)
.filter((e) => e.status === "relaxed")
.map((e) => [Number(g.nodes[e.source].label.replace(/\(.*/, "")), Number(g.nodes[e.target].label.replace(/\(.*/, ""))])
.sort();
expect(critical).toEqual([[0,2],[2,3],[3,5]]);
});

it("graph-bellman-ford: Bellman-Ford 最短路", () => {
const r = runTemplate("graph-bellman-ford");
// 手算(源点0): R1 后 [0,3,2,5,6], R2 无更新提前终止, 无负权环
const edges: Edge[] = [[0,1,4],[0,2,2],[1,2,3],[2,1,1],[1,3,2],[1,4,3],[2,3,4],[2,4,5]];
expect(refBellmanFord(5, edges, 0)).toEqual([0, 3, 2, 5, 6]);
const dist = strArray(gvar(r, "dist"));
expect(dist).toEqual(["0:0", "1:3", "2:2", "3:5", "4:6"]);
expect(lastFinal(r).title).toBe("Bellman-Ford 完成"); // 无负权环
});

it("graph-bipartite: 二分图判定", () => {
const r = runTemplate("graph-bipartite");
// 手算 2 染色: 0:A → 1:B,3:B → 2:A(邻1,3) → 5:A(邻3) → 4:B(邻2) → 检查 4-5(B-A)✓
// 所有边端点异色, 是二分图
expect(lastFinal(r).title).toBe("是二分图");
});

it("graph-euler: 欧拉路径(Hierholzer)", () => {
const r = runTemplate("graph-euler");
// 无向度数: 0:2, 1:3, 2:3, 3:2 → 奇数度节点 1,2 → 存在欧拉路径(非回路)
const edges: Edge[] = [[0,1,1],[0,2,1],[1,2,1],[2,3,1],[3,1,1]];
const evt = lastFinal(r);
expect(evt.title).toBe("欧拉路径");
const m = evt.description.match(/欧拉路径: ([\d\s->]+)/);
expect(m, `无法解析欧拉路径: ${evt.description}`).not.toBeNull();
const path = m![1].split("->").map((s) => Number(s.trim()));
// 独立验证: 路径恰好使用 5 条边各一次
expect(isEulerPath(path, edges)).toBe(true);
});

it("graph-tarjan: Tarjan 强连通分量", () => {
const r = runTemplate("graph-tarjan");
// 手算 SCC: {0,1,2}(0→1→2→0), {3}(3→4无回路), {4,5,6}(4→5→6→4), {7}(孤立)
const expected = [[0,1,2],[3],[4,5,6],[7]];
const got = parseSCCs(lastFinal(r).description);
expect(got).toEqual(expected);
});

it("graph-kosaraju: Kosaraju 强连通分量", () => {
const r = runTemplate("graph-kosaraju");
const expected = [[0,1,2],[3],[4,5,6],[7]];
const p = payloadOf(lastFinal(r));
expect(p.sccCount).toBe(4);
const got = (p.sccs as string[][])
.map((c) => c.map(Number).sort((a, b) => a - b))
.sort((a, b) => a[0] - b[0]);
expect(got).toEqual(expected);
});

it("graph-coloring: 图着色(贪心)", () => {
const r = runTemplate("graph-coloring");
// 手算贪心(按 0..5 顺序, 邻居=无向): 0→色0; 1→色1; 2→色2; 3→色0; 4→色1; 5→色2, 共 3 色
const edges: Edge[] = [[0,1,1],[0,2,1],[1,2,1],[1,3,1],[2,4,1],[3,4,1],[3,5,1],[4,5,1]];
const evt = lastFinal(r);
expect(evt.title).toBe("图着色完成");
const m = evt.description.match(/使用了 (\d+) 种颜色/);
expect(m).not.toBeNull();
expect(Number(m![1])).toBe(3);
// 独立验证合法性: 每条边端点颜色不同(node.distance 即颜色)
const g = graphOf(r);
const colorOf = (id: string) => g.nodes[id].distance as number;
for (const [u, v] of edges) {
expect(colorOf(`v${u}`), `边 ${u}-${v} 端点同色`).not.toBe(colorOf(`v${v}`));
}
});
});

// ── 动态规划验证 ───────────────────────────────────────────

describe("动态规划模板验证", () => {
it("knapsack-01: 0/1 背包", () => {
const r = runTemplate("knapsack-01");
// 模板: 物品 (w,v)=(2,6),(2,3),(6,5),(5,4),(4,6), 容量 W=10
// 手算枚举: 最优 {1,2,5} 重量 8 价值 15; 次优 {1,2,3} 价值 14
const items: [number, number][] = [[2,6],[2,3],[6,5],[5,4],[4,6]];
expect(refKnapsackBrute(items, 10)).toBe(15); // 暴力参考交叉验证手算
const evt = lastFinal(r);
const m = evt.title.match(/最优解: 价值 (\d+)/);
expect(m, `无法解析: ${evt.title}`).not.toBeNull();
expect(Number(m![1])).toBe(15);
});

it("lcs: 最长公共子序列", () => {
const r = runTemplate("lcs");
// 经典算例 LCS("ABCBDAB","BDCABA")=4(如 "BCBA")
expect(refLCS("ABCBDAB", "BDCABA")).toBe(4);
const evt = lastFinal(r);
const m = evt.title.match(/LCS = "(.*)"，长度 (\d+)/);
expect(m, `无法解析: ${evt.title}`).not.toBeNull();
expect(Number(m![2])).toBe(4);
// 独立验证: 上报的 LCS 确为两串的公共子序列
const s = m![1];
const isSubseq = (sub: string, str: string) => {
let i = 0;
for (const ch of str) if (ch === sub[i]) i++;
return i === sub.length;
};
expect(isSubseq(s, "ABCBDAB") && isSubseq(s, "BDCABA")).toBe(true);
});

it("edit-distance: 编辑距离", () => {
const r = runTemplate("edit-distance");
// 经典算例 kitten→sitting: k→s 替换, e→i 替换, +g 插入 = 3
expect(refEditDistance("kitten", "sitting")).toBe(3);
const evt = lastFinal(r);
const m = evt.title.match(/编辑距离 = (\d+)/);
expect(m, `无法解析: ${evt.title}`).not.toBeNull();
expect(Number(m![1])).toBe(3);
});

it("matrix-chain: 矩阵链乘法", () => {
const r = runTemplate("matrix-chain");
// CLRS 经典算例 p=[30,35,15,5,10,20,25], 最优 15125
expect(refMatrixChain([30, 35, 15, 5, 10, 20, 25])).toBe(15125);
const evt = lastFinal(r);
const m = evt.title.match(/最少乘法次数: (\d+)/);
expect(m, `无法解析: ${evt.title}`).not.toBeNull();
expect(Number(m![1])).toBe(15125);
});

it("lis: 最长递增子序列", () => {
const r = runTemplate("lis");
// 经典算例 [10,9,2,5,3,7,101,18], LIS 长度 4(如 2,3,7,18)
const arr = [10, 9, 2, 5, 3, 7, 101, 18];
expect(refLIS(arr)).toBe(4);
const evt = lastFinal(r);
const m = evt.title.match(/LIS 长度 = (\d+)/);
expect(m, `无法解析: ${evt.title}`).not.toBeNull();
expect(Number(m![1])).toBe(4);
// 独立验证: 上报序列严格递增且为原数组子序列
const sm = evt.description.match(/最长递增子序列: \[([\d,\s]+)\]/);
expect(sm).not.toBeNull();
const seq = sm![1].split(",").map((s) => Number(s.trim()));
expect(seq.length).toBe(4);
for (let i = 1; i < seq.length; i++) expect(seq[i]).toBeGreaterThan(seq[i - 1]);
let idx = 0;
for (const x of arr) if (x === seq[idx]) idx++;
expect(idx).toBe(seq.length);
});
});
