"use client";

import React, { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  EdgeProps
} from "@xyflow/react";

export const SemanticEdge = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  markerEnd,
}: EdgeProps) => {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  });

  const relType = (data?.relationship_type as string) || "imports";
  const edgeColor = (data?.color as string) || "#818cf8";
  const weight = data?.weight ? Number(data.weight) : 0;

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: edgeColor,
          strokeWidth: 2,
          strokeDasharray: relType === "calls" ? "4,4" : undefined,
          opacity: 0.85
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan"
        >
          <button
            type="button"
            className="group px-2 py-0.5 rounded text-[9px] font-mono tracking-tight bg-slate-950/90 border transition-all hover:scale-105 shadow-md flex items-center gap-1 select-none cursor-pointer"
            style={{
              borderColor: `${edgeColor}60`,
              color: edgeColor,
            }}
            title="Click to view line evidence & relationship details"
          >
            <span>{relType}</span>
            {weight > 1 && (
              <span className="text-[8px] opacity-70">({weight})</span>
            )}
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
});

SemanticEdge.displayName = "SemanticEdge";
