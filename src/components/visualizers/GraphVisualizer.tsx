import { useRef, useEffect } from "react";
import * as d3 from "d3";
import type { VisualGraphNode, VisualGraphEdge } from "../../types";

type D3ZoomG = d3.Selection<SVGGElement, undefined, null, undefined>;

interface GraphVisualizerProps {
  nodes: Record<string, VisualGraphNode>;
  edges: Record<string, VisualGraphEdge>;
  highlightedNodes?: string[];
  width: number;
  height: number;
}

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  status: VisualGraphNode["status"];
  distance: number | string;
}

interface SimEdge extends d3.SimulationLinkDatum<SimNode> {
  id: string;
  weight: number;
  status: VisualGraphEdge["status"];
}

const statusColors: Record<string, string> = {
  unvisited: "var(--text-muted)",
  visiting: "var(--primary)",
  visited: "var(--success)",
  final: "var(--warning)",
};

export default function GraphVisualizer({
  nodes,
  edges,
  highlightedNodes = [],
  width,
  height,
}: GraphVisualizerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simRef = useRef<d3.Simulation<SimNode, SimEdge> | null>(null);
  const simNodesRef = useRef<Map<string, SimNode>>(new Map());
  const prevNodeIdsRef = useRef<Set<string>>(new Set());
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, undefined> | null>(null);

  // 清理仿真
  useEffect(() => {
    return () => {
      simRef.current?.stop();
      simRef.current = null;
    };
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || width <= 0 || height <= 0) return;

    const nodeEntries = Object.values(nodes);
    if (nodeEntries.length === 0) {
      simRef.current?.stop();
      simRef.current = null;
      simNodesRef.current.clear();
      prevNodeIdsRef.current = new Set();
      const d3svg = d3.select(svg);
      d3svg.selectAll("*").remove();
      d3svg.append("text")
        .attr("x", width / 2).attr("y", height / 2)
        .attr("text-anchor", "middle").attr("dominant-baseline", "middle")
        .attr("fill", "var(--text-muted)").attr("font-size", "14px")
        .text("暂无数据，请运行代码");
      return;
    }

    const edgeEntries = Object.values(edges);
    const currentNodeIds = new Set(nodeEntries.map((n) => n.id));
    const structureChanged = !setsEqual(currentNodeIds, prevNodeIdsRef.current);

    // 如果图结构没变（只是状态/高亮变了），只更新视觉属性，不动仿真
    if (!structureChanged && simRef.current) {
      updateVisuals(svg, nodes, edgeEntries, highlightedNodes);
      return;
    }

    // 图结构变化：重建仿真
    prevNodeIdsRef.current = currentNodeIds;
    simRef.current?.stop();

    const d3svg = d3.select(svg);
    d3svg.selectAll("*").remove();

    // 复用旧位置，新节点随机初始化
    const simNodes: SimNode[] = nodeEntries.map((n) => {
      const prev = simNodesRef.current.get(n.id);
      return {
        id: n.id,
        label: n.label,
        status: n.status,
        distance: n.distance,
        x: prev?.x ?? width / 2 + (Math.random() - 0.5) * width * 0.4,
        y: prev?.y ?? height / 2 + (Math.random() - 0.5) * height * 0.4,
        fx: prev?.fx,
        fy: prev?.fy,
      };
    });

    // 更新位置缓存
    const nodeMap = new Map(simNodes.map((n) => [n.id, n]));
    simNodesRef.current = nodeMap;

    const simEdges: SimEdge[] = edgeEntries.map((e) => ({
      id: e.id,
      source: nodeMap.get(e.source) as SimNode,
      target: nodeMap.get(e.target) as SimNode,
      weight: e.weight,
      status: e.status,
    }));

    const g = d3svg.append("g");

    // d3-zoom 支持（双指缩放 + 鼠标滚轮）
    const zoomBehavior = d3.zoom<SVGSVGElement, undefined>()
      .scaleExtent([0.3, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform.toString());
      });
    d3svg.call(zoomBehavior);
    zoomRef.current = zoomBehavior;

    // 边
    const edgeSel = g.append("g").selectAll<SVGGElement, SimEdge>(".ge")
      .data(simEdges).join("g").attr("class", "ge");

    const edgeLines = edgeSel.append("line")
      .attr("stroke", (d) => edgeStroke(d.status))
      .attr("stroke-width", (d) => d.status === "active" ? 3 : d.status === "relaxed" ? 2.5 : 1.5)
      .attr("stroke-dasharray", (d) => d.status === "disabled" ? "4,4" : "none");

    edgeSel.append("text")
      .attr("text-anchor", "middle").attr("dominant-baseline", "central")
      .attr("fill", "var(--text-muted)").attr("font-size", "11px").attr("font-weight", "500")
      .attr("pointer-events", "none")
      .text((d) => d.weight);

    // 节点
    const nodeRadius = 22;
    const nodeSel = g.append("g").selectAll<SVGGElement, SimNode>(".gn")
      .data(simNodes).join("g").attr("class", "gn").attr("cursor", "grab");

    nodeSel.append("circle").attr("class", "hl-ring")
      .attr("r", nodeRadius + 5)
      .attr("fill", "none")
      .attr("stroke", (d) => highlightedNodes.includes(d.id) ? "var(--warning)" : "transparent")
      .attr("stroke-width", 2)
      .attr("opacity", (d) => highlightedNodes.includes(d.id) ? 0.6 : 0);

    nodeSel.append("circle").attr("class", "main-circle").attr("r", nodeRadius)
      .attr("fill", (d) => statusColors[d.status] || statusColors.unvisited)
      .attr("stroke", (d) => highlightedNodes.includes(d.id) ? "var(--warning)" : "var(--border)")
      .attr("stroke-width", (d) => highlightedNodes.includes(d.id) ? 3 : 1.5);

    nodeSel.append("text").attr("class", "node-label")
      .attr("text-anchor", "middle").attr("dy", "-0.2em")
      .attr("fill", "#fff").attr("font-size", "12px").attr("font-weight", "600")
      .attr("pointer-events", "none")
      .text((d) => d.label);

    nodeSel.filter((d) => d.status !== "unvisited")
      .append("text").attr("class", "dist-label")
      .attr("text-anchor", "middle").attr("dy", "1.0em")
      .attr("fill", "var(--text)").attr("font-size", "10px")
      .attr("pointer-events", "none")
      .text((d) => typeof d.distance === "number" ? `d=${d.distance}` : d.distance);

    // 力仿真
    const sim = d3.forceSimulation<SimNode>(simNodes)
      .force("link", d3.forceLink<SimNode, SimEdge>(simEdges).id((d) => d.id).distance(120))
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(nodeRadius + 10));

    // 拖拽
    const drag = d3.drag<SVGGElement, SimNode>()
      .on("start", (ev, d) => { if (!ev.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
      .on("drag", (ev, d) => { d.fx = ev.x; d.fy = ev.y; })
      .on("end", (ev, d) => { if (!ev.active) sim.alphaTarget(0); d.fx = null; d.fy = null; });
    nodeSel.call(drag);

    sim.on("tick", () => {
      edgeLines
        .attr("x1", (d) => ((d.source as SimNode).x ?? 0))
        .attr("y1", (d) => ((d.source as SimNode).y ?? 0))
        .attr("x2", (d) => ((d.target as SimNode).x ?? 0))
        .attr("y2", (d) => ((d.target as SimNode).y ?? 0));

      edgeSel.select("text")
        .attr("x", (d) => (((d.source as SimNode).x ?? 0) + ((d.target as SimNode).x ?? 0)) / 2)
        .attr("y", (d) => (((d.source as SimNode).y ?? 0) + ((d.target as SimNode).y ?? 0)) / 2);

      nodeSel.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    simRef.current = sim;
    sim.alpha(1).alphaDecay(0.03).restart();
  }, [nodes, edges, highlightedNodes, width, height]);

  return (
    <svg ref={svgRef} width={width} height={height} style={{ display: "block" }} />
  );
}

/** 图结构不变时，只更新节点/边的视觉属性 */
function updateVisuals(
  svg: SVGSVGElement,
  nodes: Record<string, VisualGraphNode>,
  edges: VisualGraphEdge[],
  highlightedNodes: string[],
): void {
  const d3svg = d3.select(svg);

  // 更新边
  const edgeMap = new Map(edges.map((e) => [e.id, e]));
  d3svg.selectAll<SVGGElement, SimEdge>(".ge").each(function () {
    const g = d3.select(this);
    const edgeId = (g.datum() as { id?: string } | undefined)?.id;
    if (!edgeId) return;
    const edge = edgeMap.get(edgeId);
    if (!edge) return;
    g.select("line")
      .attr("stroke", edgeStroke(edge.status))
      .attr("stroke-width", edge.status === "active" ? 3 : edge.status === "relaxed" ? 2.5 : 1.5)
      .attr("stroke-dasharray", edge.status === "disabled" ? "4,4" : "none");
  });

  // 更新节点
  d3svg.selectAll<SVGGElement, SimNode>(".gn").each(function (d) {
    const g = d3.select(this);
    const nodeData = nodes[d.id];
    if (!nodeData) return;

    g.select(".main-circle")
      .attr("fill", statusColors[nodeData.status] || statusColors.unvisited)
      .attr("stroke", highlightedNodes.includes(d.id) ? "var(--warning)" : "var(--border)")
      .attr("stroke-width", highlightedNodes.includes(d.id) ? 3 : 1.5);

    g.select(".hl-ring")
      .attr("stroke", highlightedNodes.includes(d.id) ? "var(--warning)" : "transparent")
      .attr("opacity", highlightedNodes.includes(d.id) ? 0.6 : 0);

    // 更新距离标签
    const distLabel = g.select(".dist-label");
    if (nodeData.status !== "unvisited") {
      const text = typeof nodeData.distance === "number" ? `d=${nodeData.distance}` : nodeData.distance;
      if (distLabel.empty()) {
        g.append("text").attr("class", "dist-label")
          .attr("text-anchor", "middle").attr("dy", "1.0em")
          .attr("fill", "var(--text)").attr("font-size", "10px")
          .attr("pointer-events", "none")
          .text(text);
      } else {
        distLabel.text(text);
      }
    }
  });
}

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const id of a) {
    if (!b.has(id)) return false;
  }
  return true;
}

function edgeStroke(status: string): string {
  if (status === "active") return "var(--primary)";
  if (status === "relaxed") return "var(--success)";
  if (status === "disabled") return "var(--border)";
  return "var(--border)";
}
