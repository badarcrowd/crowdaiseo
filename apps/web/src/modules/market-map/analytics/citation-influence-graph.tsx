"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import type { ProviderProfile, DomainType } from "../domain/types";

const DOMAIN_TYPE_COLOR: Record<DomainType, string> = {
  Community: "hsl(var(--chart-5))",
  Authority: "hsl(var(--chart-1))",
  Documentation: "hsl(var(--chart-2))",
  Blog: "hsl(var(--chart-3))",
  News: "hsl(var(--chart-4))",
  Web: "hsl(var(--muted-foreground))",
};

const ALL_DOMAIN_TYPES: DomainType[] = [
  "Authority",
  "Documentation",
  "News",
  "Blog",
  "Community",
  "Web",
];

type EdgeDef = {
  provider: string;
  domainType: DomainType;
  share: number;
  color: string;
};

type NodePos = { x: number; y: number; r: number };

// Layout: providers on the left, domain types on the right (bipartite graph)
const SVG_W = 520;
const SVG_H = 340;
const LEFT_X = 110;
const RIGHT_X = 410;

function providerY(idx: number, total: number) {
  const padding = 60;
  const spacing = (SVG_H - padding * 2) / Math.max(total - 1, 1);
  return padding + idx * spacing;
}

function domainTypeY(idx: number, total: number) {
  const padding = 40;
  const spacing = (SVG_H - padding * 2) / Math.max(total - 1, 1);
  return padding + idx * spacing;
}

type Props = { profiles: ProviderProfile[] };

export function CitationInfluenceGraph({ profiles }: Readonly<Props>) {
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const edges: EdgeDef[] = useMemo(() => {
    const result: EdgeDef[] = [];
    for (const profile of profiles) {
      for (const [dtype, share] of Object.entries(profile.citationsByDomainType) as [
        DomainType,
        number,
      ][]) {
        if (share > 0.02) {
          result.push({
            provider: profile.provider,
            domainType: dtype,
            share,
            color: profile.color,
          });
        }
      }
    }
    return result;
  }, [profiles]);

  const providerNodes: Record<string, NodePos> = useMemo(() => {
    const nodes: Record<string, NodePos> = {};
    profiles.forEach((p, i) => {
      nodes[p.provider] = { x: LEFT_X, y: providerY(i, profiles.length), r: 18 };
    });
    return nodes;
  }, [profiles]);

  const domainNodes: Record<DomainType, NodePos> = useMemo(() => {
    const nodes: Record<string, NodePos> = {};
    ALL_DOMAIN_TYPES.forEach((dt, i) => {
      nodes[dt] = { x: RIGHT_X, y: domainTypeY(i, ALL_DOMAIN_TYPES.length), r: 14 };
    });
    return nodes as Record<DomainType, NodePos>;
  }, []);

  // Aggregate max share per edge for stroke width scaling
  const maxShare = Math.max(...edges.map((e) => e.share), 0.01);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Citation Influence Network</CardTitle>
        <CardDescription>
          Edge thickness = citation volume share — reveals which source types each provider relies on
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-8">
          <div className="min-w-0 flex-1">
            <svg
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              className="w-full"
              style={{ maxHeight: 360 }}
            >
              {/* Edges */}
              {edges.map((e) => {
                const pNode = providerNodes[e.provider];
                const dNode = domainNodes[e.domainType];
                if (!pNode || !dNode) return null;
                const edgeKey = `${e.provider}__${e.domainType}`;
                const isHovered = hoveredEdge === edgeKey;
                const isNodeHovered =
                  hoveredNode === e.provider || hoveredNode === e.domainType;
                const strokeW = Math.max(1, (e.share / maxShare) * 8);
                const opacity = isHovered || isNodeHovered ? 0.85 : 0.28;
                // Bezier control point between the two x positions
                const cx = (pNode.x + dNode.x) / 2;
                return (
                  <path
                    key={edgeKey}
                    d={`M${pNode.x + pNode.r},${pNode.y} C${cx},${pNode.y} ${cx},${dNode.y} ${dNode.x - dNode.r},${dNode.y}`}
                    fill="none"
                    stroke={e.color}
                    strokeWidth={strokeW}
                    strokeOpacity={opacity}
                    className="cursor-pointer transition-all duration-150"
                    onMouseEnter={() => setHoveredEdge(edgeKey)}
                    onMouseLeave={() => setHoveredEdge(null)}
                  />
                );
              })}

              {/* Provider nodes */}
              {profiles.map((p) => {
                const node = providerNodes[p.provider];
                if (!node) return null;
                const isHovered = hoveredNode === p.provider;
                return (
                  <g
                    key={p.provider}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredNode(p.provider)}
                    onMouseLeave={() => setHoveredNode(null)}
                  >
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={node.r + (isHovered ? 3 : 0)}
                      fill={p.color}
                      fillOpacity={isHovered ? 0.9 : 0.7}
                      stroke="hsl(var(--background))"
                      strokeWidth={2}
                      className="transition-all duration-150"
                    />
                    <text
                      x={node.x - node.r - 6}
                      y={node.y}
                      textAnchor="end"
                      dominantBaseline="central"
                      fontSize={10}
                      fontWeight={600}
                      fill="hsl(var(--foreground))"
                      fontFamily="var(--font-sans)"
                    >
                      {p.displayName}
                    </text>
                  </g>
                );
              })}

              {/* Domain type nodes */}
              {ALL_DOMAIN_TYPES.map((dt) => {
                const node = domainNodes[dt];
                const color = DOMAIN_TYPE_COLOR[dt];
                const isHovered = hoveredNode === dt;
                const hasEdge = edges.some((e) => e.domainType === dt);
                return (
                  <g
                    key={dt}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredNode(dt)}
                    onMouseLeave={() => setHoveredNode(null)}
                  >
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={node.r + (isHovered ? 3 : 0)}
                      fill={hasEdge ? color : "hsl(var(--muted))"}
                      fillOpacity={hasEdge ? (isHovered ? 0.9 : 0.65) : 0.3}
                      stroke="hsl(var(--background))"
                      strokeWidth={1.5}
                      className="transition-all duration-150"
                    />
                    <text
                      x={node.x + node.r + 6}
                      y={node.y}
                      textAnchor="start"
                      dominantBaseline="central"
                      fontSize={10}
                      fontWeight={500}
                      fill={hasEdge ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))"}
                      fontFamily="var(--font-sans)"
                    >
                      {dt}
                    </text>
                  </g>
                );
              })}

              {/* Column labels */}
              <text
                x={LEFT_X}
                y={12}
                textAnchor="middle"
                fontSize={9}
                fill="hsl(var(--muted-foreground))"
                fontFamily="var(--font-sans)"
                fontWeight={600}
                letterSpacing={1}
              >
                AI PROVIDERS
              </text>
              <text
                x={RIGHT_X}
                y={12}
                textAnchor="middle"
                fontSize={9}
                fill="hsl(var(--muted-foreground))"
                fontFamily="var(--font-sans)"
                fontWeight={600}
                letterSpacing={1}
              >
                SOURCE TYPES
              </text>
            </svg>
          </div>

          {/* Legend */}
          <div className="shrink-0 space-y-3 lg:w-44">
            <div>
              <div className="text-muted-foreground mb-1.5 text-[10px] font-semibold uppercase tracking-wider">
                Source Types
              </div>
              <div className="space-y-1.5">
                {ALL_DOMAIN_TYPES.map((dt) => (
                  <div key={dt} className="flex items-center gap-2">
                    <div
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: DOMAIN_TYPE_COLOR[dt] }}
                    />
                    <span className="text-foreground text-xs">{dt}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-border border-t pt-3">
              <div className="text-muted-foreground mb-1.5 text-[10px] font-semibold uppercase tracking-wider">
                Edge Weight
              </div>
              <div className="text-muted-foreground text-[10px]">
                Thicker edges = higher share of citations from that source type
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
