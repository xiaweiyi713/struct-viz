import type {
  Literal,
  VisualStructure,
  VisualGraphNode,
  VisualGraphEdge,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

// ── 内部数据结构 ──

interface InternalGraphNode {
  id: string;
  label: string;
  status: "unvisited" | "visiting" | "visited" | "final";
  distance: number;
  previous: string | null;
}

interface InternalGraphEdge {
  id: string;
  source: string;
  target: string;
  weight: number;
  status: "normal" | "relaxed" | "active" | "disabled";
}

// ── GraphRuntime ──

export class GraphRuntime implements StructureRuntime {
  private nodes = new Map<string, InternalGraphNode>();
  private edges: InternalGraphEdge[] = [];
  private adjacency = new Map<string, Array<{ edgeId: string; to: string; weight: number }>>();
  private edgeIdCounter = 0;
  private nodeCount: number;

  constructor(nodeCount: number) {
    this.nodeCount = nodeCount;
    // 初始化节点
    for (let i = 0; i < nodeCount; i++) {
      const id = `v${i}`;
      this.nodes.set(id, {
        id,
        label: `${i}`,
        status: "unvisited",
        distance: Infinity,
        previous: null,
      });
      this.adjacency.set(id, []);
    }
  }

  // ── 工具方法 ──

  private nextEdgeId(): string {
    this.edgeIdCounter += 1;
    return `edge-${this.edgeIdCounter}`;
  }

  private buildVisualNodes(): Record<string, VisualGraphNode> {
    const result: Record<string, VisualGraphNode> = {};
    for (const [id, node] of this.nodes) {
      result[id] = {
        id,
        label: node.label,
        status: node.status,
        distance: node.distance === Infinity ? "∞" : node.distance,
      };
    }
    return result;
  }

  private buildVisualEdges(): Record<string, VisualGraphEdge> {
    const result: Record<string, VisualGraphEdge> = {};
    for (const edge of this.edges) {
      result[edge.id] = {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        weight: edge.weight,
        status: edge.status,
      };
    }
    return result;
  }

  /** 添加一条有向边 */
  addEdge(from: number, to: number, weight: number): void {
    const sourceId = `v${from}`;
    const targetId = `v${to}`;

    if (!this.nodes.has(sourceId) || !this.nodes.has(targetId)) {
      throw new Error(`边的端点不存在: ${from} -> ${to}`);
    }

    const id = this.nextEdgeId();
    this.edges.push({
      id,
      source: sourceId,
      target: targetId,
      weight,
      status: "normal",
    });

    this.adjacency.get(sourceId)!.push({ edgeId: id, to: targetId, weight });
  }

  /** 重置图状态（用于重新运行算法） */
  private resetState(): void {
    for (const node of this.nodes.values()) {
      node.status = "unvisited";
      node.distance = Infinity;
      node.previous = null;
    }
    for (const edge of this.edges) {
      edge.status = "normal";
    }
  }

  // ── StructureRuntime 实现 ──

  executeMethod(
    method: string,
    args: Literal[],
    recorder: TraceRecorder,
    line: number,
  ): void {
    switch (method) {
      case "addEdge":
        this.addEdge(Number(args[0]), Number(args[1]), Number(args[2]));
        break;
      case "dijkstra":
        this.doDijkstra(Number(args[0]), recorder, line);
        break;
      case "bfs":
        this.doBFS(Number(args[0]), recorder, line);
        break;
      case "dfs":
        this.doDFS(Number(args[0]), recorder, line);
        break;
      case "prim":
        this.doPrim(Number(args[0]), recorder, line);
        break;
      case "kruskal":
        this.doKruskal(recorder, line);
        break;
      case "topoSort":
        this.doTopoSort(recorder, line);
        break;
      case "floyd":
        this.doFloyd(recorder, line);
        break;
      case "criticalPath":
        this.doCriticalPath(recorder, line);
        break;
      case "bellmanFord":
        this.doBellmanFord(Number(args[0]), recorder, line);
        break;
      case "isBipartite":
        this.doBipartite(recorder, line);
        break;
      case "eulerPath":
        this.doEulerPath(recorder, line);
        break;
      case "kosaraju":
        this.doKosaraju(recorder, line);
        break;
      case "graphColoring":
        this.doGraphColoring(recorder, line);
        break;
      case "tarjan":
        this.doTarjan(recorder, line);
        break;
      default:
        throw new Error(`Graph 不支持方法 "${method}"`);
    }
  }

  getSnapshot(): VisualStructure {
    return {
      type: "graph",
      nodes: this.buildVisualNodes(),
      edges: this.buildVisualEdges(),
    };
  }

  getVariables(): Record<string, RuntimeValue> {
    const distEntries: string[] = [];
    const visitedList: string[] = [];

    for (const [, node] of this.nodes) {
      const distStr = node.distance === Infinity ? "∞" : String(node.distance);
      distEntries.push(`${node.label}:${distStr}`);
      if (node.status === "final" || node.status === "visited") {
        visitedList.push(node.label);
      }
    }

    return {
      nodeCount: {
        type: "number",
        value: this.nodeCount,
        display: `${this.nodeCount}`,
      },
      edgeCount: {
        type: "number",
        value: this.edges.length,
        display: `${this.edges.length}`,
      },
      dist: {
        type: "array",
        value: distEntries,
        display: `[${distEntries.join(", ")}]`,
      },
      visited: {
        type: "array",
        value: visitedList,
        display: visitedList.length > 0 ? `[${visitedList.join(", ")}]` : "[]",
      },
    };
  }

  // ── Dijkstra 算法 ──

  private doDijkstra(source: number, recorder: TraceRecorder, line: number): void {
    const sourceId = `v${source}`;

    if (!this.nodes.has(sourceId)) {
      throw new Error(`源节点 ${source} 不存在`);
    }

    // 重置状态
    this.resetState();

    // ── 步骤 1: 初始化距离 ──

    const sourceNode = this.nodes.get(sourceId)!;
    sourceNode.distance = 0;

    const initDistances: string[] = [];
    for (const node of this.nodes.values()) {
      const d = node.id === sourceId ? "0" : "∞";
      initDistances.push(`d[${node.label}]=${d}`);
    }

    recorder.record({
      type: "INIT_DISTANCE",
      title: "初始化距离",
      description: `Dijkstra 算法开始。将源节点 ${source} 的距离设为 0，其余节点距离设为 ∞。${initDistances.join("；")}`,
      codeLine: line,
      pseudoLine: 1,
      targets: [sourceId],
      payload: { source },
    });

    // 优先队列（简单实现：每次遍历找最小距离的未访问节点）
    const finalized = new Set<string>();
    const remaining = new Set<string>();
    for (const id of this.nodes.keys()) {
      remaining.add(id);
    }

    // ── 主循环 ──

    while (remaining.size > 0) {
      // 选择距离最小的未访问节点
      let minId: string | null = null;
      let minDist = Infinity;

      for (const id of remaining) {
        const node = this.nodes.get(id)!;
        if (node.distance < minDist) {
          minDist = node.distance;
          minId = id;
        }
      }

      // 剩余节点不可达
      if (minId === null || minDist === Infinity) {
        const unreachableLabels: string[] = [];
        for (const id of remaining) {
          unreachableLabels.push(this.nodes.get(id)!.label);
        }
        recorder.record({
          type: "VISIT_NODE",
          title: "无可达节点",
          description: `剩余未访问节点 [${unreachableLabels.join(", ")}] 的距离均为 ∞，无法继续松弛，算法结束`,
          codeLine: line,
          pseudoLine: 5,
          targets: [],
        });
        break;
      }

      // 从剩余集合中移除
      remaining.delete(minId);
      const currentNode = this.nodes.get(minId)!;
      currentNode.status = "visiting";

      // ── 步骤 2: 访问节点 ──

      recorder.record({
        type: "VISIT_NODE",
        title: `访问节点 ${currentNode.label}（距离 = ${currentNode.distance}）`,
        description: `从未访问节点中选择距离最小的节点 ${currentNode.label}（d = ${currentNode.distance}）。${currentNode.previous !== null ? `前驱节点为 ${this.nodes.get(currentNode.previous)!.label}` : "该节点为源节点"}`,
        codeLine: line,
        pseudoLine: 6,
        targets: [minId],
      });

      // ── 步骤 3: 松弛所有出边 ──

      const neighbors = this.adjacency.get(minId)!;
      for (const { edgeId, to, weight } of neighbors) {
        if (finalized.has(to)) continue;

        const neighborNode = this.nodes.get(to)!;
        const edge = this.edges.find((e) => e.id === edgeId)!;
        const oldDist = neighborNode.distance;
        const newDist = currentNode.distance + weight;

        // 标记边为 active（正在考察）
        edge.status = "active";

        if (newDist < oldDist) {
          // 松弛成功
          neighborNode.distance = newDist;
          neighborNode.previous = minId;
          edge.status = "relaxed";

          const oldDistStr = oldDist === Infinity ? "∞" : String(oldDist);

          // ── RELAX_EDGE + UPDATE_DISTANCE ──

          recorder.record({
            type: "RELAX_EDGE",
            title: `松弛边 ${currentNode.label} -> ${neighborNode.label}`,
            description: `考察边 (${currentNode.label}, ${neighborNode.label})，权重 = ${weight}。${newDist} < ${oldDistStr}，松弛成功`,
            codeLine: line,
            pseudoLine: 9,
            targets: [edgeId],
            payload: { from: currentNode.label, to: neighborNode.label, weight },
          });

          recorder.record({
            type: "UPDATE_DISTANCE",
            title: `更新 d[${neighborNode.label}] = ${oldDistStr} -> ${newDist}`,
            description: `经过节点 ${currentNode.label} 到达 ${neighborNode.label} 的路径更短: d[${currentNode.label}] + ${weight} = ${currentNode.distance} + ${weight} = ${newDist}，小于原距离 ${oldDistStr}`,
            codeLine: line,
            pseudoLine: 10,
            targets: [to],
            payload: {
              node: neighborNode.label,
              oldDist: oldDist === Infinity ? "∞" : oldDist,
              newDist,
            },
          });
        } else {
          // 松弛失败
          const oldDistStr = oldDist === Infinity ? "∞" : String(oldDist);

          recorder.record({
            type: "RELAX_EDGE",
            title: `考察边 ${currentNode.label} -> ${neighborNode.label}（无需松弛）`,
            description: `考察边 (${currentNode.label}, ${neighborNode.label})，权重 = ${weight}。${newDist} >= ${oldDistStr}，不更新`,
            codeLine: line,
            pseudoLine: 9,
            targets: [edgeId],
            payload: { from: currentNode.label, to: neighborNode.label, weight },
          });

          edge.status = "normal";
        }
      }

      // ── 步骤 4: 标记节点已完成 ──

      currentNode.status = "final";
      finalized.add(minId);

      const finalizedLabels: string[] = [];
      for (const id of finalized) {
        finalizedLabels.push(this.nodes.get(id)!.label);
      }

      recorder.record({
        type: "MARK_FINAL",
        title: `节点 ${currentNode.label} 已确定最短路径`,
        description: `节点 ${currentNode.label} 的最短距离 ${currentNode.distance} 已确定（Dijkstra 贪心性质：已确定节点的距离不会再被更新）。已确定节点: [${finalizedLabels.join(", ")}]`,
        codeLine: line,
        pseudoLine: 7,
        targets: [minId],
        payload: { distance: currentNode.distance },
      });
    }
  }

  // ── BFS 广度优先搜索 ──

  private doBFS(source: number, recorder: TraceRecorder, line: number): void {
    const sourceId = `v${source}`;
    if (!this.nodes.has(sourceId)) throw new Error(`源节点 ${source} 不存在`);
    this.resetState();

    const sourceNode = this.nodes.get(sourceId)!;
    sourceNode.status = "visiting";
    sourceNode.distance = 0;

    recorder.record({
      type: "VISIT_NODE",
      title: `BFS 从节点 ${source} 开始`,
      description: `初始化：将源节点 ${source} 入队，距离设为 0`,
      codeLine: line,
      pseudoLine: 4,
      targets: [sourceId],
    });

    const queue: string[] = [sourceId];
    const visitedOrder: string[] = [sourceNode.label];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const current = this.nodes.get(currentId)!;
      current.status = "final";

      recorder.record({
        type: "DEQUEUE",
        title: `出队节点 ${current.label}`,
        description: `当前队列: [${queue.map((id) => this.nodes.get(id)!.label).join(", ")}]。访问节点 ${current.label}（层 ${current.distance}）`,
        codeLine: line,
        pseudoLine: 6,
        targets: [currentId],
      });

      const neighbors = this.adjacency.get(currentId)!;
      for (const { edgeId, to } of neighbors) {
        const neighbor = this.nodes.get(to)!;
        const edge = this.edges.find((e) => e.id === edgeId)!;

        if (neighbor.status === "unvisited") {
          neighbor.status = "visiting";
          neighbor.distance = current.distance + 1;
          neighbor.previous = currentId;
          edge.status = "relaxed";
          queue.push(to);
          visitedOrder.push(neighbor.label);

          recorder.record({
            type: "ENQUEUE",
            title: `发现节点 ${neighbor.label}（层 ${neighbor.distance}）`,
            description: `从 ${current.label} 发现未访问节点 ${neighbor.label}，入队。队列: [${queue.map((id) => this.nodes.get(id)!.label).join(", ")}]`,
            codeLine: line,
            pseudoLine: 10,
            targets: [to],
          });
        } else {
          edge.status = "active";
          recorder.record({
            type: "RELAX_EDGE",
            title: `检查边 ${current.label} -> ${neighbor.label}`,
            description: `节点 ${neighbor.label} 已访问过，跳过`,
            codeLine: line,
            pseudoLine: 8,
            targets: [edgeId],
          });
          edge.status = "normal";
        }
      }
    }

    recorder.record({
      type: "MARK_FINAL",
      title: "BFS 遍历完成",
      description: `遍历顺序: [${visitedOrder.join(" -> ")}]。共访问 ${visitedOrder.length} 个节点`,
      codeLine: line,
      pseudoLine: 5,
      targets: [],
    });
  }

  // ── DFS 深度优先搜索 ──

  private doDFS(source: number, recorder: TraceRecorder, line: number): void {
    const sourceId = `v${source}`;
    if (!this.nodes.has(sourceId)) throw new Error(`源节点 ${source} 不存在`);
    this.resetState();

    recorder.record({
      type: "VISIT_NODE",
      title: `DFS 从节点 ${source} 开始`,
      description: "使用递归方式进行深度优先搜索",
      codeLine: line,
      pseudoLine: 3,
      targets: [sourceId],
    });

    const visitedOrder: string[] = [];
    this.dfsVisit(sourceId, recorder, line, visitedOrder);

    recorder.record({
      type: "MARK_FINAL",
      title: "DFS 遍历完成",
      description: `遍历顺序: [${visitedOrder.join(" -> ")}]。共访问 ${visitedOrder.length} 个节点`,
      codeLine: line,
      pseudoLine: 3,
      targets: [],
    });
  }

  private dfsVisit(nodeId: string, recorder: TraceRecorder, line: number, visitedOrder: string[]): void {
    const node = this.nodes.get(nodeId)!;
    node.status = "visiting";
    node.distance = visitedOrder.length;
    visitedOrder.push(node.label);

    recorder.record({
      type: "VISIT_NODE",
      title: `访问节点 ${node.label}`,
      description: `递归深度 ${visitedOrder.length}，进入节点 ${node.label}`,
      codeLine: line,
      pseudoLine: 6,
      targets: [nodeId],
    });

    const neighbors = this.adjacency.get(nodeId)!;
    for (const { edgeId, to } of neighbors) {
      const neighbor = this.nodes.get(to)!;
      const edge = this.edges.find((e) => e.id === edgeId)!;

      if (neighbor.status === "unvisited") {
        edge.status = "relaxed";
        recorder.record({
          type: "PUSH",
          title: `探索边 ${node.label} -> ${neighbor.label}`,
          description: `从 ${node.label} 深入未访问节点 ${neighbor.label}`,
          codeLine: line,
          pseudoLine: 9,
          targets: [edgeId, to],
        });

        this.dfsVisit(to, recorder, line, visitedOrder);
      } else {
        edge.status = "active";
        recorder.record({
          type: "RELAX_EDGE",
          title: `回溯边 ${node.label} -> ${neighbor.label}`,
          description: `节点 ${neighbor.label} 已访问（${neighbor.status === "final" ? "已完成" : "正在访问"}），跳过`,
          codeLine: line,
          pseudoLine: 8,
          targets: [edgeId],
        });
        edge.status = "normal";
      }
    }

    node.status = "final";
    recorder.record({
      type: "POP",
      title: `回溯离开节点 ${node.label}`,
      description: `节点 ${node.label} 的所有邻居已处理完毕`,
      codeLine: line,
      pseudoLine: 7,
      targets: [nodeId],
    });
  }

  // ── Prim 最小生成树 ──

  private doPrim(source: number, recorder: TraceRecorder, line: number): void {
    const sourceId = `v${source}`;
    if (!this.nodes.has(sourceId)) throw new Error(`源节点 ${source} 不存在`);
    this.resetState();

    const inMST = new Set<string>();
    const key = new Map<string, number>();
    const parentEdge = new Map<string, string>();

    for (const id of this.nodes.keys()) {
      key.set(id, Infinity);
    }
    key.set(sourceId, 0);

    recorder.record({
      type: "INIT_DISTANCE",
      title: `Prim 从节点 ${source} 开始`,
      description: `初始化：所有节点 key 值设为 ∞，源节点 ${source} 的 key 设为 0`,
      codeLine: line,
      pseudoLine: 3,
      targets: [sourceId],
      payload: { source },
    });

    for (let iter = 0; iter < this.nodes.size; iter++) {
      // 选最小 key 的未加入节点
      let minId: string | null = null;
      let minKey = Infinity;
      for (const id of this.nodes.keys()) {
        if (!inMST.has(id) && key.get(id)! < minKey) {
          minKey = key.get(id)!;
          minId = id;
        }
      }
      if (minId === null) {
        if (inMST.size < this.nodes.size) {
          recorder.record({
            type: "MARK_FINAL",
            title: "Prim：图不连通，无法构建 MST",
            description: `剩余节点不可达，已构建 ${inMST.size}/${this.nodes.size} 个节点的 MST`,
            codeLine: line,
            pseudoLine: 5,
            targets: [],
          });
          return;
        }
        break;
      }

      inMST.add(minId);
      const node = this.nodes.get(minId)!;
      node.status = "visiting";

      // 高亮入选边
      const mstEdgeId = parentEdge.get(minId);
      if (mstEdgeId) {
        this.edges.find((e) => e.id === mstEdgeId)!.status = "relaxed";
      }

      recorder.record({
        type: "VISIT_NODE",
        title: `加入节点 ${node.label}（key = ${minKey === Infinity ? "∞" : minKey}）`,
        description: `选择 key 最小的未加入节点 ${node.label} 加入 MST${mstEdgeId ? `，通过边 ${mstEdgeId}` : "（源节点）"}`,
        codeLine: line,
        pseudoLine: 6,
        targets: [minId],
      });

      node.status = "final";

      // 更新邻居的 key
      for (const { edgeId, to, weight } of this.adjacency.get(minId)!) {
        if (inMST.has(to)) continue;

        const edge = this.edges.find((e) => e.id === edgeId)!;
        edge.status = "active";

        if (weight < key.get(to)!) {
          const oldKey = key.get(to)!;
          key.set(to, weight);
          parentEdge.set(to, edgeId);
          edge.status = "relaxed";

          recorder.record({
            type: "RELAX_EDGE",
            title: `更新节点 ${this.nodes.get(to)!.label} 的 key: ${oldKey === Infinity ? "∞" : oldKey} -> ${weight}`,
            description: `边 (${node.label}, ${this.nodes.get(to)!.label}) 权重 ${weight} < 当前 key，更新`,
            codeLine: line,
            pseudoLine: 10,
            targets: [edgeId],
          });
        } else {
          recorder.record({
            type: "RELAX_EDGE",
            title: `边 (${node.label}, ${this.nodes.get(to)!.label}) 权重 ${weight} ≥ key ${key.get(to)}，跳过`,
            description: `不更新`,
            codeLine: line,
            pseudoLine: 8,
            targets: [edgeId],
          });
          edge.status = "normal";
        }
      }
    }

    const mstEdges = this.edges.filter((e) => e.status === "relaxed");
    const totalWeight = mstEdges.reduce((s, e) => s + e.weight, 0);

    recorder.record({
      type: "MARK_FINAL",
      title: "Prim MST 构建完成",
      description: `最小生成树包含 ${mstEdges.length} 条边，总权重 = ${totalWeight}`,
      codeLine: line,
      pseudoLine: 11,
      targets: mstEdges.map((e) => e.id),
      payload: { totalWeight },
    });
  }

  // ── Kruskal 最小生成树 ──

  private doKruskal(recorder: TraceRecorder, line: number): void {
    this.resetState();

    recorder.record({
      type: "VISIT_NODE",
      title: "Kruskal 算法开始",
      description: "按边权从小到大排序，逐步选取不形成环的边",
      codeLine: line,
      pseudoLine: 0,
      targets: [],
    });

    // 并查集
    const parent = new Map<string, string>();
    const rank = new Map<string, number>();
    for (const id of this.nodes.keys()) {
      parent.set(id, id);
      rank.set(id, 0);
    }

    const find = (x: string): string => {
      while (parent.get(x) !== x) {
        parent.set(x, parent.get(parent.get(x)!)!);
        x = parent.get(x)!;
      }
      return x;
    };

    const union = (x: string, y: string): boolean => {
      const rx = find(x), ry = find(y);
      if (rx === ry) return false;
      if (rank.get(rx)! < rank.get(ry)!) parent.set(rx, ry);
      else if (rank.get(rx)! > rank.get(ry)!) parent.set(ry, rx);
      else { parent.set(ry, rx); rank.set(rx, rank.get(rx)! + 1); }
      return true;
    };

    // 按权重排序的边
    const sortedEdges = [...this.edges].sort((a, b) => a.weight - b.weight);

    recorder.record({
      type: "VISIT_NODE",
      title: "边排序完成",
      description: `排序后: ${sortedEdges.map((e) => `(${this.nodes.get(e.source)!.label},${this.nodes.get(e.target)!.label}):${e.weight}`).join(", ")}`,
      codeLine: line,
      pseudoLine: 1,
      targets: [],
    });

    let totalWeight = 0;
    let edgeCount = 0;

    for (const edge of sortedEdges) {
      edge.status = "active";
      const srcLabel = this.nodes.get(edge.source)!.label;
      const tgtLabel = this.nodes.get(edge.target)!.label;

      recorder.record({
        type: "RELAX_EDGE",
        title: `考察边 (${srcLabel}, ${tgtLabel})，权重 ${edge.weight}`,
        description: `检查加入此边是否形成环`,
        codeLine: line,
        pseudoLine: 5,
        targets: [edge.id],
      });

      if (union(edge.source, edge.target)) {
        edge.status = "relaxed";
        totalWeight += edge.weight;
        edgeCount++;

        recorder.record({
          type: "MARK_FINAL",
          title: `加入边 (${srcLabel}, ${tgtLabel})`,
          description: `不形成环，加入 MST。当前已选 ${edgeCount} 条边，总权重 ${totalWeight}`,
          codeLine: line,
          pseudoLine: 6,
          targets: [edge.id, edge.source, edge.target],
        });

        if (edgeCount === this.nodes.size - 1) break;
      } else {
        edge.status = "disabled";

        recorder.record({
          type: "RELAX_EDGE",
          title: `跳过边 (${srcLabel}, ${tgtLabel})`,
          description: `加入后会形成环，跳过`,
          codeLine: line,
          pseudoLine: 5,
          targets: [edge.id],
        });
      }
    }

    recorder.record({
      type: "MARK_FINAL",
      title: "Kruskal MST 构建完成",
      description: `最小生成树包含 ${edgeCount} 条边，总权重 = ${totalWeight}`,
      codeLine: line,
      pseudoLine: 8,
      targets: [],
      payload: { totalWeight, edgeCount },
    });
  }

  // ── 拓扑排序 ──

  private doTopoSort(recorder: TraceRecorder, line: number): void {
    this.resetState();

    // 计算入度
    const inDegree = new Map<string, number>();
    for (const id of this.nodes.keys()) {
      inDegree.set(id, 0);
    }
    for (const edge of this.edges) {
      inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
    }

    recorder.record({
      type: "VISIT_NODE",
      title: "拓扑排序开始",
      description: `入度: ${[...inDegree.entries()].map(([id, d]) => `${this.nodes.get(id)!.label}:${d}`).join(", ")}`,
      codeLine: line,
      pseudoLine: 1,
      targets: [],
    });

    const queue: string[] = [];
    for (const [id, d] of inDegree) {
      if (d === 0) queue.push(id);
    }

    const result: string[] = [];

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      const node = this.nodes.get(nodeId)!;
      node.status = "visiting";
      result.push(node.label);

      recorder.record({
        type: "DEQUEUE",
        title: `输出节点 ${node.label}（入度 0）`,
        description: `当前拓扑序列: [${result.join(", ")}]`,
        codeLine: line,
        pseudoLine: 6,
        targets: [nodeId],
      });

      node.status = "final";

      for (const { edgeId, to } of this.adjacency.get(nodeId)!) {
        const edge = this.edges.find((e) => e.id === edgeId)!;
        edge.status = "relaxed";
        const newDeg = (inDegree.get(to) ?? 1) - 1;
        inDegree.set(to, newDeg);

        recorder.record({
          type: "RELAX_EDGE",
          title: `减小 ${this.nodes.get(to)!.label} 的入度至 ${newDeg}`,
          description: `删除边 (${node.label}, ${this.nodes.get(to)!.label})，${this.nodes.get(to)!.label} 入度变为 ${newDeg}`,
          codeLine: line,
          pseudoLine: 8,
          targets: [edgeId],
        });

        if (newDeg === 0) {
          queue.push(to);
          recorder.record({
            type: "ENQUEUE",
            title: `节点 ${this.nodes.get(to)!.label} 入度为 0，入队`,
            description: `所有前驱已处理完`,
            codeLine: line,
            pseudoLine: 10,
            targets: [to],
          });
        }
      }
    }

    if (result.length < this.nodes.size) {
      recorder.record({
        type: "CHECK_INVARIANT",
        title: "图中存在环",
        description: `只输出了 ${result.length}/${this.nodes.size} 个节点，图中存在环，无法完成拓扑排序`,
        codeLine: line,
        pseudoLine: 11,
        targets: [],
      });
    } else {
      recorder.record({
        type: "MARK_FINAL",
        title: "拓扑排序完成",
        description: `拓扑序列: [${result.join(", ")}]`,
        codeLine: line,
        pseudoLine: 11,
        targets: [],
      });
    }
  }

  // ── Floyd 最短路径 ──

  private doFloyd(recorder: TraceRecorder, line: number): void {
    this.resetState();

    const ids = [...this.nodes.keys()];
    const n = ids.length;
    const dist: number[][] = Array.from({ length: n }, () => Array(n).fill(Infinity));
    const path: (number | null)[][] = Array.from({ length: n }, () => Array(n).fill(null));

    // 初始化
    for (let i = 0; i < n; i++) dist[i][i] = 0;
    for (const edge of this.edges) {
      const i = ids.indexOf(edge.source);
      const j = ids.indexOf(edge.target);
      if (i >= 0 && j >= 0) {
        dist[i][j] = edge.weight;
        path[i][j] = i;
      }
    }

    recorder.record({
      type: "INIT_DISTANCE",
      title: "Floyd 算法开始",
      description: `初始化距离矩阵，对角线为 0，有边的设为边权，其余为 ∞`,
      codeLine: line,
      pseudoLine: 1,
      targets: [],
    });

    // 三重循环
    for (let k = 0; k < n; k++) {
      const kNode = this.nodes.get(ids[k])!;
      kNode.status = "visiting";

      recorder.record({
        type: "VISIT_NODE",
        title: `中间节点 k = ${kNode.label}`,
        description: `尝试以节点 ${kNode.label} 作为中转，检查所有节点对 (i, j)`,
        codeLine: line,
        pseudoLine: 2,
        targets: [ids[k]],
      });

      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (dist[i][k] + dist[k][j] < dist[i][j]) {
            const oldDist = dist[i][j];
            dist[i][j] = dist[i][k] + dist[k][j];
            path[i][j] = k;

            const iLabel = this.nodes.get(ids[i])!.label;
            const jLabel = this.nodes.get(ids[j])!.label;

            recorder.record({
              type: "UPDATE_DISTANCE",
              title: `d[${iLabel}][${jLabel}] = ${oldDist === Infinity ? "∞" : oldDist} -> ${dist[i][j]}`,
              description: `经过 ${kNode.label} 中转: d[${iLabel}][${kNode.label}] + d[${kNode.label}][${jLabel}] = ${dist[i][k]} + ${dist[k][j]} = ${dist[i][j]}`,
              codeLine: line,
              pseudoLine: 6,
              targets: [ids[i], ids[k], ids[j]],
            });
          }
        }
      }

      kNode.status = "final";
    }

    recorder.record({
      type: "MARK_FINAL",
      title: "Floyd 算法完成",
      description: `所有节点对的最短距离已计算完成`,
      codeLine: line,
      pseudoLine: 7,
      targets: [],
    });
  }

  // ── 关键路径（AOE 网） ──

  private doCriticalPath(recorder: TraceRecorder, line: number): void {
    this.resetState();

    // 计算入度
    const inDegree = new Map<string, number>();
    const outDegree = new Map<string, number>();
    for (const id of this.nodes.keys()) {
      inDegree.set(id, 0);
      outDegree.set(id, 0);
    }
    for (const edge of this.edges) {
      inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
      outDegree.set(edge.source, (outDegree.get(edge.source) ?? 0) + 1);
    }

    recorder.record({
      type: "VISIT_NODE",
      title: "关键路径分析开始",
      description: "AOE 网：计算事件最早发生时间 ve 和最迟发生时间 vl",
      codeLine: line,
      pseudoLine: 1,
      targets: [],
    });

    // 正向拓扑排序求 ve
    const ve = new Map<string, number>();
    for (const id of this.nodes.keys()) ve.set(id, 0);

    const queue: string[] = [];
    for (const [id, d] of inDegree) {
      if (d === 0) queue.push(id);
    }

    const topoOrder: string[] = [];
    const tempInDeg = new Map(inDegree);

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      topoOrder.push(nodeId);
      const node = this.nodes.get(nodeId)!;
      node.status = "visiting";

      for (const { edgeId, to, weight } of this.adjacency.get(nodeId)!) {
        const newVe = ve.get(nodeId)! + weight;
        if (newVe > ve.get(to)!) {
          ve.set(to, newVe);
        }
        const newDeg = (tempInDeg.get(to) ?? 1) - 1;
        tempInDeg.set(to, newDeg);
        if (newDeg === 0) queue.push(to);

        this.edges.find((e) => e.id === edgeId)!.status = "relaxed";
      }

      node.status = "final";

      recorder.record({
        type: "VISIT_NODE",
        title: `正向: 事件 ${node.label}，ve = ${ve.get(nodeId)}`,
        description: `拓扑排序计算 ve(${node.label}) = ${ve.get(nodeId)}`,
        codeLine: line,
        pseudoLine: 5,
        targets: [nodeId],
      });
    }

    // 检查是否有环（拓扑排序未遍历完所有节点）
    if (topoOrder.length < this.nodes.size) {
      recorder.record({
        type: "MARK_FINAL",
        title: "关键路径：图中有环，无法计算",
        description: `拓扑排序只访问了 ${topoOrder.length}/${this.nodes.size} 个节点，图中存在环`,
        codeLine: line,
        pseudoLine: 1,
        targets: [],
      });
      return;
    }

    // 逆拓扑排序求 vl
    const vl = new Map<string, number>();
    const lastNode = topoOrder[topoOrder.length - 1];
    for (const id of this.nodes.keys()) vl.set(id, ve.get(lastNode)!);

    recorder.record({
      type: "VISIT_NODE",
      title: `终点 ve = ${ve.get(lastNode)!}，初始化 vl`,
      description: `终点 ${this.nodes.get(lastNode)!.label} 的 ve 和 vl 均为 ${ve.get(lastNode)!}`,
      codeLine: line,
      pseudoLine: 7,
      targets: [lastNode],
    });

    for (let i = topoOrder.length - 2; i >= 0; i--) {
      const nodeId = topoOrder[i];
      for (const { to, weight } of this.adjacency.get(nodeId)!) {
        const newVl = vl.get(to)! - weight;
        if (newVl < vl.get(nodeId)!) {
          vl.set(nodeId, newVl);
        }
      }

      recorder.record({
        type: "UPDATE_DISTANCE",
        title: `逆向: 事件 ${this.nodes.get(nodeId)!.label}，vl = ${vl.get(nodeId)}`,
        description: `vl(${this.nodes.get(nodeId)!.label}) = ${vl.get(nodeId)}`,
        codeLine: line,
        pseudoLine: 9,
        targets: [nodeId],
      });
    }

    // 标记关键活动（关键边）
    const criticalEdges: string[] = [];
    for (const edge of this.edges) {
      const e = ve.get(edge.source)!;
      const l = vl.get(edge.target)! - edge.weight;
      if (e === l) {
        edge.status = "relaxed";
        criticalEdges.push(edge.id);
      } else {
        edge.status = "normal";
      }
    }

    recorder.record({
      type: "MARK_FINAL",
      title: "关键路径计算完成",
      description: `关键活动 ${criticalEdges.length} 条。总工期 = ${ve.get(lastNode)!}`,
      codeLine: line,
      pseudoLine: 11,
      targets: criticalEdges,
      payload: {
        ve: Object.fromEntries(ve),
        vl: Object.fromEntries(vl),
        totalDuration: ve.get(lastNode)!,
      },
    });
  }

  // ── Bellman-Ford 最短路径 ──

  private doBellmanFord(source: number, recorder: TraceRecorder, line: number): void {
    const sourceId = `v${source}`;
    if (!this.nodes.has(sourceId)) throw new Error(`源节点 ${source} 不存在`);
    this.resetState();

    const sourceNode = this.nodes.get(sourceId)!;
    sourceNode.distance = 0;

    recorder.record({
      type: "INIT_DISTANCE",
      title: `Bellman-Ford 从节点 ${source} 开始`,
      description: `初始化: d[${source}] = 0，其余为 ∞。将进行 ${this.nodes.size - 1} 轮松弛`,
      codeLine: line,
      pseudoLine: 1,
      targets: [sourceId],
      payload: { source },
    });

    const ids = [...this.nodes.keys()];
    const n = ids.length;

    // n-1 轮松弛
    for (let round = 1; round < n; round++) {
      let updated = false;

      recorder.record({
        type: "VISIT_NODE",
        title: `第 ${round} 轮松弛`,
        description: `遍历所有边，尝试松弛`,
        codeLine: line,
        pseudoLine: 2,
        targets: [],
      });

      for (const edge of this.edges) {
        const u = this.nodes.get(edge.source)!;
        const v = this.nodes.get(edge.target)!;
        edge.status = "active";

        if (u.distance !== Infinity && u.distance + edge.weight < v.distance) {
          const oldDist = v.distance === Infinity ? "∞" : v.distance;
          v.distance = u.distance + edge.weight;
          v.previous = edge.source;
          edge.status = "relaxed";
          updated = true;

          recorder.record({
            type: "RELAX_EDGE",
            title: `松弛 ${u.label} -> ${v.label}: d[${v.label}] = ${oldDist} -> ${v.distance}`,
            description: `d[${u.label}] + w = ${u.distance} + ${edge.weight} = ${u.distance + edge.weight} < ${oldDist}`,
            codeLine: line,
            pseudoLine: 5,
            targets: [edge.id, edge.target],
          });
        } else {
          recorder.record({
            type: "RELAX_EDGE",
            title: `检查 ${u.label} -> ${v.label}（无需松弛）`,
            description: `d[${u.label}] = ${u.distance === Infinity ? "∞" : u.distance}, d[${u.label}] + ${edge.weight} >= d[${v.label}] = ${v.distance === Infinity ? "∞" : v.distance}`,
            codeLine: line,
            pseudoLine: 4,
            targets: [edge.id],
          });
          edge.status = "normal";
        }
      }

      // 标记本轮确定的最短距离
      for (const id of ids) {
        const node = this.nodes.get(id)!;
        if (node.distance !== Infinity) {
          node.status = "visited";
        }
      }

      if (!updated) {
        recorder.record({
          type: "MARK_FINAL",
          title: `第 ${round} 轮无更新，提前终止`,
          description: "所有距离已稳定，无需继续松弛",
          codeLine: line,
          pseudoLine: 10,
          targets: [],
        });
        break;
      }
    }

    // 检查负权环
    let hasNegativeCycle = false;
    for (const edge of this.edges) {
      const u = this.nodes.get(edge.source)!;
      const v = this.nodes.get(edge.target)!;
      if (u.distance !== Infinity && u.distance + edge.weight < v.distance) {
        hasNegativeCycle = true;
        edge.status = "active";
        recorder.record({
          type: "CHECK_INVARIANT",
          title: "检测到负权环",
          description: `边 (${u.label}, ${v.label}) 仍可松弛，图中存在负权环`,
          codeLine: line,
          pseudoLine: 9,
          targets: [edge.id],
        });
        break;
      }
    }

    if (!hasNegativeCycle) {
      // 标记最终状态
      for (const id of ids) {
        const node = this.nodes.get(id)!;
        if (node.distance !== Infinity) node.status = "final";
      }
      for (const edge of this.edges) {
        if (edge.status === "relaxed") edge.status = "relaxed";
        else edge.status = "normal";
      }

      const distList = ids.map((id) => {
        const node = this.nodes.get(id)!;
        return `${node.label}:${node.distance === Infinity ? "∞" : node.distance}`;
      });

      recorder.record({
        type: "MARK_FINAL",
        title: "Bellman-Ford 完成",
        description: `最短距离: [${distList.join(", ")}]。无负权环`,
        codeLine: line,
        pseudoLine: 10,
        targets: [],
      });
    }
  }

  // ── 二分图检测（BFS 染色法） ──

  private doBipartite(recorder: TraceRecorder, line: number): void {
    this.resetState();

    const color = new Map<string, 0 | 1>();
    for (const id of this.nodes.keys()) color.set(id, -1 as 0 | 1);

    recorder.record({
      type: "VISIT_NODE",
      title: "二分图检测开始",
      description: "使用 BFS 染色法：相邻节点必须染不同颜色，若冲突则不是二分图",
      codeLine: line,
      pseudoLine: 1,
      targets: [],
    });

    let isBipartite = true;
    let conflictEdge = "";

    for (const startId of this.nodes.keys()) {
      if (color.get(startId) !== -1 as 0 | 1) continue;

      color.set(startId, 0);
      const startNode = this.nodes.get(startId)!;
      startNode.status = "visiting";

      recorder.record({
        type: "VISIT_NODE",
        title: `从节点 ${startNode.label} 开始，染颜色 0`,
        description: "新的连通分量，将起始节点染为颜色 0",
        codeLine: line,
        pseudoLine: 5,
        targets: [startId],
      });

      const queue: string[] = [startId];

      while (queue.length > 0 && isBipartite) {
        const currentId = queue.shift()!;
        const current = this.nodes.get(currentId)!;
        const currentColor = color.get(currentId)!;
        current.status = "final";

        for (const { edgeId, to } of this.adjacency.get(currentId)!) {
          const neighbor = this.nodes.get(to)!;
          const edge = this.edges.find((e) => e.id === edgeId)!;
          edge.status = "active";

          const neighborColor = color.get(to)!;
          if (neighborColor === -1 as 0 | 1) {
            const newColor = (1 - currentColor) as 0 | 1;
            color.set(to, newColor);
            neighbor.status = "visiting";
            edge.status = "relaxed";
            queue.push(to);

            recorder.record({
              type: "RELAX_EDGE",
              title: `节点 ${neighbor.label} 染颜色 ${newColor}`,
              description: `邻居 ${current.label}(颜色${currentColor}) → ${neighbor.label}(颜色${newColor})`,
              codeLine: line,
              pseudoLine: 9,
              targets: [edgeId, to],
            });
          } else if (neighborColor === currentColor) {
            isBipartite = false;
            conflictEdge = edgeId;
            edge.status = "active";

            recorder.record({
              type: "CHECK_INVARIANT",
              title: `冲突！节点 ${current.label} 和 ${neighbor.label} 同为颜色 ${currentColor}`,
              description: `相邻节点颜色相同，不是二分图`,
              codeLine: line,
              pseudoLine: 8,
              targets: [edgeId, currentId, to],
            });
            break;
          } else {
            recorder.record({
              type: "RELAX_EDGE",
              title: `节点 ${neighbor.label} 已染颜色 ${neighborColor}，无冲突`,
              description: `颜色不同（${currentColor} vs ${neighborColor}），继续`,
              codeLine: line,
              pseudoLine: 7,
              targets: [edgeId],
            });
            edge.status = "normal";
          }
        }
      }

      if (!isBipartite) break;
    }

    if (isBipartite) {
      recorder.record({
        type: "MARK_FINAL",
        title: "是二分图",
        description: `所有相邻节点颜色不同，该图是二分图。颜色分配: ${[...color.entries()].map(([id, c]) => `${this.nodes.get(id)!.label}:${c}`).join(", ")}`,
        codeLine: line,
        pseudoLine: 10,
        targets: [],
      });
    } else {
      recorder.record({
        type: "MARK_FINAL",
        title: "不是二分图",
        description: `存在相邻同色节点，该图不是二分图`,
        codeLine: line,
        pseudoLine: 8,
        targets: conflictEdge ? [conflictEdge] : [],
      });
    }
  }

  // ── 欧拉路径（Hierholzer 算法） ──

  private doEulerPath(recorder: TraceRecorder, line: number): void {
    this.resetState();

    const ids = [...this.nodes.keys()];

    // 统计度数（无向图：入度 + 出度）
    const degree = new Map<string, number>();
    for (const id of ids) degree.set(id, 0);
    for (const edge of this.edges) {
      degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
      degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
    }

    // 检查欧拉路径条件：恰好 0 或 2 个奇数度节点
    const oddNodes = ids.filter((id) => (degree.get(id) ?? 0) % 2 !== 0);

    recorder.record({
      type: "VISIT_NODE",
      title: "欧拉路径检测",
      description: `度数: ${ids.map((id) => `${this.nodes.get(id)!.label}:${degree.get(id)}`).join(", ")}。奇数度节点: [${oddNodes.map((id) => this.nodes.get(id)!.label).join(", ")}]（需要 0 或 2 个）`,
      codeLine: line,
      pseudoLine: 3,
      targets: oddNodes,
    });

    if (oddNodes.length !== 0 && oddNodes.length !== 2) {
      recorder.record({
        type: "CHECK_INVARIANT",
        title: "不存在欧拉路径",
        description: `奇数度节点有 ${oddNodes.length} 个，需要 0（欧拉回路）或 2（欧拉路径）个`,
        codeLine: line,
        pseudoLine: 8,
        targets: [],
      });
      return;
    }

    // 选择起点
    const startId = oddNodes.length === 2 ? oddNodes[0] : ids[0];
    const startLabel = this.nodes.get(startId)!.label;

    recorder.record({
      type: "VISIT_NODE",
      title: `从节点 ${startLabel} 开始`,
      description: oddNodes.length === 2
        ? `从奇数度节点 ${startLabel} 出发`
        : `所有节点度数为偶数，从 ${startLabel} 出发寻找欧拉回路`,
      codeLine: line,
      pseudoLine: 9,
      targets: [startId],
    });

    // 构建邻接表（支持删除已用边）
    const usedEdges = new Set<string>();
    const adj = new Map<string, string[]>();
    for (const id of ids) adj.set(id, []);
    for (const edge of this.edges) {
      adj.get(edge.source)!.push(edge.id);
      // 无向图：反向也加入
      adj.get(edge.target)!.push(edge.id);
    }

    const getOtherEnd = (edgeId: string, nodeId: string): string => {
      const edge = this.edges.find((e) => e.id === edgeId)!;
      return edge.source === nodeId ? edge.target : edge.source;
    };

    // Hierholzer 算法
    const path: string[] = [];
    const stack: string[] = [startId];

    while (stack.length > 0) {
      const currentId = stack[stack.length - 1];
      const current = this.nodes.get(currentId)!;
      current.status = "visiting";

      // 找一条未使用的边
      let foundEdge = false;
      const edgeList = adj.get(currentId) ?? [];

      while (edgeList.length > 0) {
        const edgeId = edgeList.shift()!;
        if (usedEdges.has(edgeId)) continue;

        usedEdges.add(edgeId);
        const edge = this.edges.find((e) => e.id === edgeId)!;
        edge.status = "relaxed";

        const nextId = getOtherEnd(edgeId, currentId);
        const nextLabel = this.nodes.get(nextId)!.label;

        recorder.record({
          type: "RELAX_EDGE",
          title: `走边 (${current.label}, ${nextLabel})`,
          description: `Hierholzer: 从 ${current.label} 沿未用边走到 ${nextLabel}`,
          codeLine: line,
          pseudoLine: 9,
          targets: [edgeId, nextId],
        });

        stack.push(nextId);
        foundEdge = true;
        break;
      }

      if (!foundEdge) {
        stack.pop();
        current.status = "final";
        path.push(current.label);

        if (path.length > 1 || stack.length > 0) {
          recorder.record({
            type: "VISIT_NODE",
            title: `回溯到节点 ${current.label}，加入路径`,
            description: `当前路径: [${path.join(" -> ")}]`,
            codeLine: line,
            pseudoLine: 10,
            targets: [currentId],
          });
        }
      }
    }

    path.reverse();

    const isCircuit = oddNodes.length === 0;
    recorder.record({
      type: "MARK_FINAL",
      title: isCircuit ? "欧拉回路" : "欧拉路径",
      description: `${isCircuit ? "欧拉回路" : "欧拉路径"}: ${path.join(" -> ")}。经过 ${usedEdges.size} 条边`,
      codeLine: line,
      pseudoLine: 11,
      targets: [],
    });
  }

  private doGraphColoring(recorder: TraceRecorder, line: number): void {
    this.resetState();

    const ids = [...this.nodes.keys()];

    recorder.record({
      type: "INIT_DISTANCE",
      title: "图着色：开始贪心着色",
      description: `按节点顺序遍历，每个节点选择最小可用颜色`,
      codeLine: line,
      targets: [],
    });

    const nodeColors = new Map<string, number>();
    let maxColor = -1;

    for (const nodeId of ids) {
      const node = this.nodes.get(nodeId)!;
      node.status = "visiting";

      const usedColors = new Set<number>();
      for (const { to } of this.adjacency.get(nodeId)!) {
        if (nodeColors.has(to)) {
          usedColors.add(nodeColors.get(to)!);
        }
      }
      for (const edge of this.edges) {
        if (edge.target === nodeId && nodeColors.has(edge.source)) {
          usedColors.add(nodeColors.get(edge.source)!);
        }
      }

      let color = 0;
      while (usedColors.has(color)) {
        color++;
      }

      nodeColors.set(nodeId, color);
      node.distance = color;
      node.label = `${node.label}(色${color})`;
      if (color > maxColor) maxColor = color;

      const usedColorsArr = [...usedColors].sort((a, b) => a - b);

      recorder.record({
        type: "VISIT_NODE",
        title: `图着色：节点 ${nodeId.replace("v", "")} 着色为 ${color}`,
        description: `邻居使用的颜色: [${usedColorsArr.length > 0 ? usedColorsArr.join(", ") : "无"}]`,
        codeLine: line,
        targets: [nodeId],
      });

      node.status = "final";
    }

    recorder.record({
      type: "MARK_FINAL",
      title: "图着色完成",
      description: `使用了 ${maxColor + 1} 种颜色`,
      codeLine: line,
      targets: [],
    });
  }

  private doTarjan(recorder: TraceRecorder, line: number): void {
    this.resetState();

    const dfn = new Map<string, number>();
    const low = new Map<string, number>();
    const stack: string[] = [];
    const onStack = new Set<string>();
    let timer = 0;
    const sccs: string[][] = [];

    for (const id of this.nodes.keys()) {
      dfn.set(id, -1);
      low.set(id, -1);
    }

    const strongConnect = (nodeId: string): void => {
      const node = this.nodes.get(nodeId)!;
      dfn.set(nodeId, timer);
      low.set(nodeId, timer);
      node.distance = timer;
      timer++;
      stack.push(nodeId);
      onStack.add(nodeId);
      node.status = "visiting";

      recorder.record({
        type: "VISIT_NODE",
        title: `访问节点 ${node.label}`,
        description: `dfn[${node.label}]=${dfn.get(nodeId)}, low[${node.label}]=${low.get(nodeId)}, 入栈`,
        codeLine: line,
        targets: [nodeId],
      });

      for (const { edgeId, to } of this.adjacency.get(nodeId)!) {
        const edge = this.edges.find((e) => e.id === edgeId)!;
        edge.status = "active";

        if (dfn.get(to) === -1) {
          recorder.record({
            type: "RELAX_EDGE",
            title: `探索边 (${node.label}, ${this.nodes.get(to)!.label})`,
            description: `节点 ${this.nodes.get(to)!.label} 未访问，递归`,
            codeLine: line,
            targets: [edgeId],
          });

          strongConnect(to);

          const newLow = Math.min(low.get(nodeId)!, low.get(to)!);
          if (newLow !== low.get(nodeId)) {
            low.set(nodeId, newLow);
            node.distance = newLow;
            recorder.record({
              type: "UPDATE_DISTANCE",
              title: `更新 low[${node.label}] = ${newLow}`,
              description: `子节点 ${this.nodes.get(to)!.label} 回溯后，low[${node.label}] = min(${low.get(nodeId)!}, low[${this.nodes.get(to)!.label}]) = ${newLow}`,
              codeLine: line,
              targets: [nodeId],
            });
          }
        } else if (onStack.has(to)) {
          const newLow = Math.min(low.get(nodeId)!, dfn.get(to)!);
          if (newLow !== low.get(nodeId)) {
            low.set(nodeId, newLow);
            node.distance = newLow;
            recorder.record({
              type: "UPDATE_DISTANCE",
              title: `更新 low[${node.label}] = ${newLow}`,
              description: `节点 ${this.nodes.get(to)!.label} 在栈中，low[${node.label}] = min(${low.get(nodeId)!}, dfn[${this.nodes.get(to)!.label}]) = ${newLow}`,
              codeLine: line,
              targets: [nodeId],
            });
          }
        }

        edge.status = "normal";
      }

      if (low.get(nodeId) === dfn.get(nodeId)) {
        const scc: string[] = [];
        let popped: string;
        do {
          popped = stack.pop()!;
          onStack.delete(popped);
          scc.push(popped);
          this.nodes.get(popped)!.status = "final";
        } while (popped !== nodeId);

        sccs.push(scc);

        const labels = scc.map((id) => this.nodes.get(id)!.label);
        recorder.record({
          type: "VISIT_NODE",
          title: `找到强连通分量 {${labels.join(", ")}}`,
          description: `根节点 ${node.label}, dfn=${dfn.get(nodeId)}, low=${low.get(nodeId)}，弹出栈中节点`,
          codeLine: line,
          targets: scc,
        });
      }
    };

    for (const [id] of dfn) {
      if (dfn.get(id) === -1) {
        strongConnect(id);
      }
    }

    for (let i = 0; i < sccs.length; i++) {
      const scc = sccs[i];
      for (const nodeId of scc) {
        this.nodes.get(nodeId)!.label = `${this.nodes.get(nodeId)!.label}(SCC${i + 1})`;
      }
    }

    recorder.record({
      type: "MARK_FINAL",
      title: "Tarjan 强连通分量",
      description: `共找到 ${sccs.length} 个强连通分量: ${sccs.map((scc, i) => `SCC${i + 1}={${scc.map((id) => this.nodes.get(id)!.label.replace(`(SCC${i + 1})`, "")).join(", ")}}`).join(", ")}`,
      codeLine: line,
      targets: [],
    });
  }

  // ── Kosaraju 强连通分量 ──

  private doKosaraju(recorder: TraceRecorder, line: number): void {
    this.resetState();

    const ids = [...this.nodes.keys()];
    const visited = new Set<string>();
    const finishOrder: string[] = [];

    recorder.record({
      type: "VISIT_NODE",
      title: "Kosaraju：第一遍 DFS（收集完成序）",
      description: "在原图上做 DFS，按完成时间从早到晚收集节点的逆后序",
      codeLine: line,
      targets: [],
    });

    const dfs1 = (nodeId: string) => {
      visited.add(nodeId);
      const node = this.nodes.get(nodeId)!;
      node.status = "visiting";

      recorder.record({
        type: "VISIT_NODE",
        title: "Kosaraju：第一遍 DFS",
        description: `访问节点 ${node.label}，递归探索其邻居`,
        codeLine: line,
        targets: [nodeId],
      });

      for (const { edgeId, to } of this.adjacency.get(nodeId)!) {
        if (!visited.has(to)) {
          const edge = this.edges.find((e) => e.id === edgeId)!;
          edge.status = "active";

          recorder.record({
            type: "RELAX_EDGE",
            title: `Kosaraju：第一遍 DFS，探索边 ${node.label} -> ${this.nodes.get(to)!.label}`,
            description: `沿边进入未访问节点 ${this.nodes.get(to)!.label}`,
            codeLine: line,
            targets: [edgeId, to],
          });

          edge.status = "normal";
          dfs1(to);
        }
      }

      node.status = "visited";
      finishOrder.push(nodeId);

      recorder.record({
        type: "POP",
        title: `Kosaraju：节点 ${node.label} 完成，加入逆后序`,
        description: `当前逆后序长度: ${finishOrder.length}`,
        codeLine: line,
        targets: [nodeId],
      });
    };

    for (const id of ids) {
      if (!visited.has(id)) {
        dfs1(id);
      }
    }

    const transposedAdj = new Map<string, Array<{ edgeId: string; to: string }>>();
    for (const id of ids) {
      transposedAdj.set(id, []);
    }
    for (const edge of this.edges) {
      transposedAdj.get(edge.target)!.push({ edgeId: edge.id, to: edge.source });
    }

    recorder.record({
      type: "VISIT_NODE",
      title: "Kosaraju：构建转置图",
      description: "反转所有边的方向，准备在转置图上按逆后序做 DFS",
      codeLine: line,
      targets: [],
    });

    for (const node of this.nodes.values()) {
      node.status = "unvisited";
    }

    const visited2 = new Set<string>();
    let sccCount = 0;
    const sccs: string[][] = [];

    for (let i = finishOrder.length - 1; i >= 0; i--) {
      const startId = finishOrder[i];
      if (visited2.has(startId)) continue;

      sccCount++;
      const component: string[] = [];

      const stack = [startId];
      while (stack.length > 0) {
        const nodeId = stack.pop()!;
        if (visited2.has(nodeId)) continue;
        visited2.add(nodeId);

        const node = this.nodes.get(nodeId)!;
        node.status = "visiting";
        node.distance = sccCount - 1;
        component.push(node.label);

        recorder.record({
          type: "VISIT_NODE",
          title: "Kosaraju：转置图 DFS",
          description: `SCC ${sccCount}: 访问节点 ${node.label}`,
          codeLine: line,
          targets: [nodeId],
        });

        for (const { edgeId, to } of transposedAdj.get(nodeId)!) {
          if (!visited2.has(to)) {
            const edge = this.edges.find((e) => e.id === edgeId)!;
            edge.status = "active";

            recorder.record({
              type: "RELAX_EDGE",
              title: `Kosaraju：转置图 DFS，探索反向边 ${node.label} <- ${this.nodes.get(to)!.label}`,
              description: `SCC ${sccCount}: 沿反向边进入节点 ${this.nodes.get(to)!.label}`,
              codeLine: line,
              targets: [edgeId, to],
            });

            edge.status = "relaxed";
            stack.push(to);
          }
        }

        node.status = "final";
      }

      sccs.push(component);

      recorder.record({
        type: "MARK_FINAL",
        title: `Kosaraju：找到 SCC ${sccCount}`,
        description: `SCC ${sccCount} 包含节点: [${component.join(", ")}]`,
        codeLine: line,
        targets: component.map((label) =>
          [...this.nodes.entries()].find(([, n]) => n.label === label)![0],
        ),
      });
    }

    recorder.record({
      type: "MARK_FINAL",
      title: "Kosaraju 强连通分量",
      description: `共找到 ${sccCount} 个强连通分量: ${sccs.map((c, i) => `SCC${i + 1}=[${c.join(",")}]`).join("; ")}`,
      codeLine: line,
      targets: [],
      payload: { sccCount, sccs },
    });
  }
}
