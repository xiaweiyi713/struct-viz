import type {
  Literal,
  VisualStructure,
  VisualGraphNode,
  VisualGraphEdge,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

// ── TCPStateMachineRuntime ──

interface TCPState {
  id: string;
  label: string;
}

interface TCPTransition {
  id: string;
  from: string;
  to: string;
  label: string;
}

const TCP_STATES: TCPState[] = [
  { id: "CLOSED", label: "CLOSED" },
  { id: "LISTEN", label: "LISTEN" },
  { id: "SYN_SENT", label: "SYN_SENT" },
  { id: "SYN_RCVD", label: "SYN_RCVD" },
  { id: "ESTABLISHED", label: "ESTABLISHED" },
  { id: "FIN_WAIT_1", label: "FIN_WAIT_1" },
  { id: "FIN_WAIT_2", label: "FIN_WAIT_2" },
  { id: "CLOSING", label: "CLOSING" },
  { id: "TIME_WAIT", label: "TIME_WAIT" },
  { id: "CLOSE_WAIT", label: "CLOSE_WAIT" },
  { id: "LAST_ACK", label: "LAST_ACK" },
];

// 定义所有可能的 TCP 状态转换
const TCP_TRANSITIONS: TCPTransition[] = [
  // 三次握手（客户端）
  { id: "t1", from: "CLOSED", to: "SYN_SENT", label: "主动打开\n发送SYN" },
  { id: "t2", from: "SYN_SENT", to: "ESTABLISHED", label: "收到SYN+ACK\n发送ACK" },
  // 三次握手（服务端）
  { id: "t3", from: "CLOSED", to: "LISTEN", label: "被动打开" },
  { id: "t4", from: "LISTEN", to: "SYN_RCVD", label: "收到SYN\n发送SYN+ACK" },
  { id: "t5", from: "SYN_RCVD", to: "ESTABLISHED", label: "收到ACK" },
  // 四次挥手（主动关闭方）
  { id: "t6", from: "ESTABLISHED", to: "FIN_WAIT_1", label: "主动关闭\n发送FIN" },
  { id: "t7", from: "FIN_WAIT_1", to: "FIN_WAIT_2", label: "收到ACK" },
  { id: "t8", from: "FIN_WAIT_2", to: "TIME_WAIT", label: "收到FIN\n发送ACK" },
  { id: "t9", from: "TIME_WAIT", to: "CLOSED", label: "等待2MSL\n超时" },
  // 四次挥手（被动关闭方）
  { id: "t10", from: "ESTABLISHED", to: "CLOSE_WAIT", label: "收到FIN\n发送ACK" },
  { id: "t11", from: "CLOSE_WAIT", to: "LAST_ACK", label: "主动关闭\n发送FIN" },
  { id: "t12", from: "LAST_ACK", to: "CLOSED", label: "收到ACK" },
  // 同时关闭
  { id: "t13", from: "FIN_WAIT_1", to: "CLOSING", label: "收到FIN\n(同时关闭)" },
  { id: "t14", from: "CLOSING", to: "TIME_WAIT", label: "收到ACK" },
];

export class TCPStateMachineRuntime implements StructureRuntime {
  private nodeStates: Map<string, VisualGraphNode> = new Map();
  private edgeStates: Map<string, VisualGraphEdge> = new Map();
  private currentState: string = "CLOSED";
  private activeTransitionIds: string[] = [];

  constructor() {
    this.initStateGraph();
  }

  private initStateGraph(): void {
    this.nodeStates = new Map();
    this.edgeStates = new Map();
    this.currentState = "CLOSED";
    this.activeTransitionIds = [];

    for (const state of TCP_STATES) {
      this.nodeStates.set(state.id, {
        id: state.id,
        label: state.label,
        status: state.id === "CLOSED" ? "visiting" : "unvisited",
        distance: 0,
      });
    }

    for (const tr of TCP_TRANSITIONS) {
      this.edgeStates.set(tr.id, {
        id: tr.id,
        source: tr.from,
        target: tr.to,
        weight: 1,
        status: "normal",
      });
    }
  }

  executeMethod(
    method: string,
    args: Literal[],
    recorder: TraceRecorder,
    line: number,
  ): void {
    switch (method) {
      case "threeWayHandshake":
        this.doThreeWayHandshake(recorder, line);
        break;
      case "fourWayWave":
        this.doFourWayWave(recorder, line);
        break;
      case "full":
        this.doFull(recorder, line);
        break;
      default:
        throw new Error(`TCPStateMachine 不支持方法 "${method}"`);
    }
  }

  getSnapshot(): VisualStructure {
    return {
      type: "graph",
      nodes: Object.fromEntries(this.nodeStates),
      edges: Object.fromEntries(this.edgeStates),
    };
  }

  getVariables(): Record<string, RuntimeValue> {
    return {
      currentState: {
        type: "string",
        value: this.currentState,
        display: this.currentState,
      },
    };
  }

  private transition(
    transitionId: string,
    recorder: TraceRecorder,
    line: number,
    title: string,
    description: string,
    isClient: boolean = true,
  ): void {
    const tr = TCP_TRANSITIONS.find((t) => t.id === transitionId);
    if (!tr) return;

    // 清除之前的高亮
    for (const [id, node] of this.nodeStates) {
      node.status = node.status === "final" ? "final" : "unvisited";
    }
    for (const [id, edge] of this.edgeStates) {
      edge.status = "normal";
    }

    // 高亮前一个状态
    const fromNode = this.nodeStates.get(tr.from);
    if (fromNode) fromNode.status = "visited";

    // 标记当前状态
    const toNode = this.nodeStates.get(tr.to);
    if (toNode) toNode.status = "visiting";

    // 高亮转换边
    const edge = this.edgeStates.get(transitionId);
    if (edge) edge.status = "active";

    this.currentState = tr.to;
    this.activeTransitionIds.push(transitionId);

    recorder.record({
      type: "VISIT_NODE",
      title,
      description: `${description}（${isClient ? "客户端" : "服务端"}）: ${tr.from} → ${tr.to}`,
      codeLine: line,
      targets: [tr.to, transitionId],
    });
  }

  private markFinal(stateId: string): void {
    const node = this.nodeStates.get(stateId);
    if (node) node.status = "final";
  }

  /** 三次握手 */
  private doThreeWayHandshake(recorder: TraceRecorder, line: number): void {
    this.initStateGraph();

    recorder.record({
      type: "VISIT_NODE",
      title: "TCP 三次握手开始",
      description: "初始状态: CLOSED。客户端和服务端都处于 CLOSED 状态",
      codeLine: line,
      targets: ["CLOSED"],
    });

    this.doThreeWayHandshakeSteps(recorder, line);
  }

  /** 四次挥手 */
  private doFourWayWave(recorder: TraceRecorder, line: number): void {
    this.initStateGraph();

    // 从 ESTABLISHED 开始
    const estNode = this.nodeStates.get("ESTABLISHED");
    if (estNode) estNode.status = "visiting";
    this.currentState = "ESTABLISHED";

    recorder.record({
      type: "VISIT_NODE",
      title: "TCP 四次挥手开始",
      description: "初始状态: ESTABLISHED。双方已建立 TCP 连接",
      codeLine: line,
      targets: ["ESTABLISHED"],
    });

    this.doFourWayWaveSteps(recorder, line);
  }

  /** 完整流程: 三次握手 + 四次挥手 */
  private doFull(recorder: TraceRecorder, line: number): void {
    this.initStateGraph();

    recorder.record({
      type: "VISIT_NODE",
      title: "TCP 完整生命周期",
      description: "初始状态: CLOSED。将依次展示三次握手建立连接和四次挥手断开连接的完整过程",
      codeLine: line,
      targets: ["CLOSED"],
    });

    // 三次握手（不复位状态图）
    this.doThreeWayHandshakeSteps(recorder, line);

    // 四次挥手（不复位状态图，从 ESTABLISHED 继续）
    this.doFourWayWaveSteps(recorder, line);
  }

  /** 三次握手核心步骤（不重置状态图） */
  private doThreeWayHandshakeSteps(recorder: TraceRecorder, line: number): void {
    // 客户端发送 SYN
    this.transition("t1", recorder, line, "第一次握手: 发送 SYN", "客户端发送 SYN 报文段，进入 SYN_SENT 状态", true);

    // 服务端被动打开
    this.transition("t3", recorder, line, "服务端被动打开", "服务端执行被动打开，进入 LISTEN 状态", false);

    // 服务端收到 SYN，发送 SYN+ACK
    this.transition("t4", recorder, line, "第二次握手: 发送 SYN+ACK", "服务端收到 SYN，发送 SYN+ACK 报文段，进入 SYN_RCVD 状态", false);

    // 客户端收到 SYN+ACK，发送 ACK
    this.transition("t2", recorder, line, "第三次握手: 发送 ACK", "客户端收到 SYN+ACK，发送 ACK 报文段，进入 ESTABLISHED 状态", true);

    // 服务端收到 ACK
    this.transition("t5", recorder, line, "服务端收到 ACK", "服务端收到 ACK，进入 ESTABLISHED 状态", false);

    this.markFinal("ESTABLISHED");
    recorder.record({
      type: "MARK_FINAL",
      title: "三次握手完成",
      description: "客户端和服务端都进入 ESTABLISHED 状态，TCP 连接建立成功",
      codeLine: line,
      targets: ["ESTABLISHED"],
    });
  }

  /** 四次挥手核心步骤（不重置状态图，从 ESTABLISHED 继续） */
  private doFourWayWaveSteps(recorder: TraceRecorder, line: number): void {
    // 从 ESTABLISHED 开始
    const estNode = this.nodeStates.get("ESTABLISHED");
    if (estNode) estNode.status = "visiting";
    this.currentState = "ESTABLISHED";

    recorder.record({
      type: "VISIT_NODE",
      title: "TCP 四次挥手开始",
      description: "初始状态: ESTABLISHED。双方已建立 TCP 连接",
      codeLine: line,
      targets: ["ESTABLISHED"],
    });

    // 第一次挥手: 客户端发送 FIN
    this.transition("t6", recorder, line, "第一次挥手: 发送 FIN", "客户端主动关闭，发送 FIN 报文段，进入 FIN_WAIT_1 状态", true);

    // 第二次挥手: 服务端收到 FIN，发送 ACK
    this.transition("t10", recorder, line, "第二次挥手: 发送 ACK", "服务端收到 FIN，发送 ACK 报文段，进入 CLOSE_WAIT 状态", false);

    // 客户端收到 ACK
    this.transition("t7", recorder, line, "客户端收到 ACK", "客户端收到 ACK，进入 FIN_WAIT_2 状态，等待服务端的 FIN", true);

    // 第三次挥手: 服务端发送 FIN
    this.transition("t11", recorder, line, "第三次挥手: 发送 FIN", "服务端发送 FIN 报文段，进入 LAST_ACK 状态", false);

    // 第四次挥手: 客户端收到 FIN，发送 ACK
    this.transition("t8", recorder, line, "第四次挥手: 发送 ACK", "客户端收到 FIN，发送 ACK 报文段，进入 TIME_WAIT 状态", true);

    // 服务端收到 ACK，关闭连接
    this.transition("t12", recorder, line, "服务端收到 ACK", "服务端收到 ACK，进入 CLOSED 状态", false);

    // 客户端等待 2MSL
    this.transition("t9", recorder, line, "等待 2MSL 超时", "客户端等待 2MSL（最大报文段生存时间）后，进入 CLOSED 状态", true);

    this.markFinal("CLOSED");
    recorder.record({
      type: "MARK_FINAL",
      title: "四次挥手完成",
      description: "双方都回到 CLOSED 状态，TCP 连接完全关闭",
      codeLine: line,
      targets: ["CLOSED"],
    });
  }
}
