import { useRef, useEffect, useCallback } from "react";
import * as d3 from "d3";
import type { VisualTreeNode } from "../../types";

interface TreeVisualizerProps {
  nodes: Record<string, VisualTreeNode>;
  rootId: string | null;
  highlightedNodes?: string[];
  width: number;
  height: number;
}

interface TreeNodeDatum {
  id: string;
  key: number | string;
  color?: "red" | "black" | "default";
  children: TreeNodeDatum[];
  metadata?: Record<string, unknown>;
}

const DURATION = 400;

export default function TreeVisualizer({
  nodes,
  rootId,
  highlightedNodes = [],
  width,
  height,
}: TreeVisualizerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const prevNodesRef = useRef<Set<string>>(new Set());

  const buildHierarchy = useCallback((): TreeNodeDatum | null => {
    if (!rootId || !nodes[rootId]) return null;
    const visited = new Set<string>();

    function buildNode(id: string): TreeNodeDatum | null {
      if (visited.has(id)) return null;
      visited.add(id);
      const node = nodes[id];
      if (!node) return null;
      const children: TreeNodeDatum[] = [];

      // Multi-way tree: use children array if present
      if (node.children && node.children.length > 0) {
        for (const childId of node.children) {
          if (nodes[childId]) {
            const child = buildNode(childId);
            if (child) children.push(child);
          }
        }
      } else {
        // Binary tree: use left/right
        if (node.left && nodes[node.left]) {
          const child = buildNode(node.left);
          if (child) children.push(child);
        }
        if (node.right && nodes[node.right]) {
          const child = buildNode(node.right);
          if (child) children.push(child);
        }
      }

      return {
        id: node.id,
        key: node.key,
        color: node.color,
        children,
        metadata: node.metadata,
      };
    }

    return buildNode(rootId);
  }, [nodes, rootId]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || width <= 0 || height <= 0) return;

    const margin = { top: 50, right: 40, bottom: 40, left: 40 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;
    if (innerW <= 0 || innerH <= 0) return;

    const d3svg = d3.select(svg);
    let container = d3svg.select<SVGGElement>(".tv-container");

    if (container.empty()) {
      // 初始化 zoom 和 container 层次
      const zoomG = d3svg.append("g").attr("class", "tv-zoom");
      container = zoomG.append("g").attr("class", "tv-container")
        .attr("transform", `translate(${margin.left},${margin.top})`);
      container.append("g").attr("class", "tv-links");
      container.append("g").attr("class", "tv-nodes");

      // d3-zoom 支持
      const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.3, 4])
        .on("zoom", (event) => {
          zoomG.attr("transform", event.transform.toString());
        });
      d3svg.call(zoomBehavior);
    } else {
      container.attr("transform", `translate(${margin.left},${margin.top})`);
    }

    const linksG = container.select<SVGGElement>(".tv-links");
    const nodesG = container.select<SVGGElement>(".tv-nodes");

    const root = buildHierarchy();

    if (!root) {
      linksG.selectAll("*").remove();
      nodesG.selectAll("*").remove();
      prevNodesRef.current = new Set();
      return;
    }

    const treeLayout = d3.tree<TreeNodeDatum>().size([innerW, innerH]);
    const hierarchyRoot = d3.hierarchy(root);
    const layout = treeLayout(hierarchyRoot);

    const nodeCount = layout.descendants().length;
    const r = Math.max(16, Math.min(22, innerW / (nodeCount * 3.5)));

    // ── 构建数据映射 ──
    const posById = new Map<string, { x: number; y: number }>();
    const dataById = new Map<string, TreeNodeDatum>();
    layout.descendants().forEach((d) => {
      posById.set(d.data.id, { x: d.x, y: d.y });
      dataById.set(d.data.id, d.data);
    });

    const curIds = new Set(dataById.keys());

    // ── 边数据 ──
    type LinkDatum = {
      sourceId: string;
      targetId: string;
      sx: number;
      sy: number;
      tx: number;
      ty: number;
      label?: string;
    };
    const linkData: LinkDatum[] = [];
    layout.links().forEach((l) => {
      const sid = (l.source.data as TreeNodeDatum).id;
      const tid = (l.target.data as TreeNodeDatum).id;
      const sp = posById.get(sid);
      const tp = posById.get(tid);
      const targetData = dataById.get(tid);
      const edgeLabel = targetData?.metadata?.edgeLabel as string | undefined;
      if (sp && tp) linkData.push({ sourceId: sid, targetId: tid, sx: sp.x, sy: sp.y, tx: tp.x, ty: tp.y, label: edgeLabel });
    });

    const linkKey = (d: LinkDatum) => `${d.sourceId}->${d.targetId}`;

    const linkSel = linksG
      .selectAll<SVGGElement, LinkDatum>(".tv-link")
      .data(linkData, linkKey);

    linkSel.exit().transition().duration(DURATION / 2).attr("opacity", 0).remove();

    // Links now use <g> containing path + optional label
    const linkEnter = linkSel.enter().append("g")
      .attr("class", "tv-link")
      .attr("opacity", 0);

    linkEnter.append("path")
      .attr("fill", "none")
      .attr("stroke", "var(--border)")
      .attr("stroke-width", 2);

    const allLinks = linkEnter.merge(linkSel);

    allLinks
      .transition()
      .duration(DURATION)
      .attr("opacity", 1);

    allLinks.select("path")
      .transition()
      .duration(DURATION)
      .ease(d3.easeCubicInOut)
      .attr("d", (d) => curvedPath(d.sx, d.sy, d.tx, d.ty));

    // Edge labels (for Trie character labels)
    allLinks.selectAll<SVGTextElement, LinkDatum>(".edge-label").remove();
    allLinks.each(function(d) {
      if (d.label) {
        const mx = (d.sx + d.tx) / 2;
        const my = (d.sy + d.ty) / 2;
        d3.select(this).append("text")
          .attr("class", "edge-label")
          .attr("x", mx)
          .attr("y", my - 6)
          .attr("text-anchor", "middle")
          .attr("font-size", "11px")
          .attr("font-weight", "600")
          .attr("fill", "var(--text-muted)")
          .text(d.label);
      }
    });

    // ── 节点数据 ──
    type NodeDatum = {
      id: string;
      key: number | string;
      color?: string;
      x: number;
      y: number;
      hl: boolean;
      metadata?: Record<string, unknown>;
    };

    const nodeData: NodeDatum[] = layout.descendants().map((d) => ({
      id: d.data.id,
      key: d.data.key,
      color: d.data.color,
      x: d.x,
      y: d.y,
      hl: highlightedNodes.includes(d.data.id),
      metadata: d.data.metadata,
    }));

    const nodeSel = nodesG
      .selectAll<SVGGElement, NodeDatum>(".tv-node")
      .data(nodeData, (d) => d.id);

    // ── Exit ──
    nodeSel.exit()
      .transition()
      .duration(DURATION / 2)
      .attr("opacity", 0)
      .remove();

    // ── Enter ──
    const nodeEnter = nodeSel.enter().append("g")
      .attr("class", "tv-node")
      .attr("transform", (d) => `translate(${d.x},${d.y})`)
      .attr("opacity", 0);

    // ── Enter + Update 合并处理 ──
    const allNodes = nodeEnter.merge(nodeSel);

    allNodes
      .transition("fade")
      .duration(DURATION)
      .attr("opacity", 1);

    allNodes
      .transition("position")
      .duration(DURATION)
      .ease(d3.easeCubicInOut)
      .attr("transform", (d) => `translate(${d.x},${d.y})`);

    // Clear previous node content and redraw based on type
    allNodes.each(function(d) {
      const g = d3.select(this);
      const keys = d.metadata?.keys as number[] | undefined;

      if (keys && keys.length > 0) {
        // B-tree / B+tree multi-key node: rectangle with cells
        drawMultiKeyNode(g, d, keys, r);
      } else {
        // Standard binary / Trie node: circle
        drawCircleNode(g, d, r);
      }
    });

    prevNodesRef.current = curIds;
  }, [nodes, rootId, highlightedNodes, width, height, buildHierarchy]);

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      style={{ display: "block" }}
    />
  );
}

function drawCircleNode(g: d3.Selection<SVGGElement, unknown, null, undefined>, d: { id: string; key: number | string; color?: string; hl: boolean; metadata?: Record<string, unknown> }, r: number) {
  g.selectAll("*").remove();

  // Highlight ring
  g.append("circle").attr("class", "hl-ring")
    .attr("r", r + 5)
    .attr("fill", "none")
    .attr("stroke", d.hl ? "var(--warning)" : "transparent")
    .attr("stroke-width", 2.5);

  // Main circle
  g.append("circle").attr("class", "main-circle")
    .attr("r", r)
    .attr("fill", fillColor(d.color))
    .attr("stroke", d.hl ? "var(--warning)" : strokeColor(d.color))
    .attr("stroke-width", d.hl ? 3.5 : 2.5);

  // Label
  const isLeaf = d.metadata?.isLeaf;
  g.append("text")
    .attr("dy", "0.35em")
    .attr("text-anchor", "middle")
    .attr("font-size", `${Math.max(10, r - 6)}px`)
    .attr("font-weight", "700")
    .attr("fill", (d.color === "red" || d.color === "black") ? "#fff" : "var(--text)")
    .attr("pointer-events", "none")
    .text(String(d.key));

  // B+ tree leaf indicator
  if (isLeaf) {
    g.append("rect")
      .attr("x", -r).attr("y", -r)
      .attr("width", r * 2).attr("height", r * 2)
      .attr("rx", 4)
      .attr("fill", "none")
      .attr("stroke", "var(--warning)")
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "3,2");
  }
}

function drawMultiKeyNode(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  d: { id: string; key: number | string; color?: string; hl: boolean; metadata?: Record<string, unknown> },
  keys: number[],
  r: number,
) {
  g.selectAll("*").remove();

  const cellW = Math.max(r, Math.min(r * 1.4, 36));
  const cellH = r * 1.6;
  const totalW = keys.length * cellW;
  const startX = -totalW / 2;
  const startY = -cellH / 2;
  const highlightedKeys = d.metadata?.highlightedKeys as number[] | [];
  const fontSize = Math.max(9, cellW * 0.4);

  // Highlight background
  if (d.hl) {
    g.append("rect")
      .attr("x", startX - 3).attr("y", startY - 3)
      .attr("width", totalW + 6).attr("height", cellH + 6)
      .attr("rx", 6)
      .attr("fill", "none")
      .attr("stroke", "var(--warning)")
      .attr("stroke-width", 2.5);
  }

  // Background rectangle
  g.append("rect")
    .attr("x", startX).attr("y", startY)
    .attr("width", totalW).attr("height", cellH)
    .attr("rx", 4)
    .attr("fill", fillColor(d.color))
    .attr("stroke", d.hl ? "var(--warning)" : strokeColor(d.color))
    .attr("stroke-width", 2);

  // Cell dividers and labels
  for (let i = 0; i < keys.length; i++) {
    const cx = startX + i * cellW;

    // Divider line (skip first cell)
    if (i > 0) {
      g.append("line")
        .attr("x1", cx).attr("y1", startY)
        .attr("x2", cx).attr("y2", startY + cellH)
        .attr("stroke", d.hl ? "var(--warning)" : strokeColor(d.color))
        .attr("stroke-width", 1);
    }

    // Key text
    const isKeyHighlighted = Array.isArray(highlightedKeys) && (highlightedKeys as number[]).includes(keys[i]);
    g.append("text")
      .attr("x", cx + cellW / 2)
      .attr("y", startY + cellH / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .attr("font-size", `${fontSize}px`)
      .attr("font-weight", "700")
      .attr("fill", isKeyHighlighted ? "var(--warning)" : (d.color === "red" || d.color === "black") ? "#fff" : "var(--text)")
      .attr("pointer-events", "none")
      .text(String(keys[i]));
  }
}

/** 生成垂直贝塞尔曲线路径 */
function curvedPath(sx: number, sy: number, tx: number, ty: number): string {
  const my = (sy + ty) / 2;
  return `M${sx},${sy} C${sx},${my} ${tx},${my} ${tx},${ty}`;
}

function fillColor(c?: string): string {
  if (c === "red") return "var(--rb-red-fill)";
  if (c === "black") return "var(--rb-black-fill)";
  return "var(--primary)";
}

function strokeColor(c?: string): string {
  if (c === "red") return "var(--rb-red-stroke)";
  if (c === "black") return "var(--rb-black-stroke)";
  return "var(--border)";
}
