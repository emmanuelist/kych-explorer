import { useEffect, useRef, useCallback } from "react";
import type cytoscape from "cytoscape";

interface GraphMinimapProps {
  cy: cytoscape.Core | null;
}

const MINIMAP_W = 160;
const MINIMAP_H = 100;
const PADDING = 10;

export function GraphMinimap({ cy }: GraphMinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const isDragging = useRef(false);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !cy) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = MINIMAP_W * dpr;
    canvas.height = MINIMAP_H * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.clearRect(0, 0, MINIMAP_W, MINIMAP_H);

    const nodes = cy.nodes();
    if (nodes.length === 0) return;

    // Compute bounding box of all nodes
    const bb = cy.elements().boundingBox();
    const graphW = bb.w || 1;
    const graphH = bb.h || 1;

    // Scale to fit minimap with padding
    const drawW = MINIMAP_W - PADDING * 2;
    const drawH = MINIMAP_H - PADDING * 2;
    const scale = Math.min(drawW / graphW, drawH / graphH);
    const offsetX = PADDING + (drawW - graphW * scale) / 2;
    const offsetY = PADDING + (drawH - graphH * scale) / 2;

    const toMiniX = (x: number) => offsetX + (x - bb.x1) * scale;
    const toMiniY = (y: number) => offsetY + (y - bb.y1) * scale;

    // Draw edges
    ctx.strokeStyle = "rgba(100, 116, 139, 0.3)";
    ctx.lineWidth = 0.5;
    cy.edges().forEach((edge) => {
      const src = edge.source().position();
      const tgt = edge.target().position();
      ctx.beginPath();
      ctx.moveTo(toMiniX(src.x), toMiniY(src.y));
      ctx.lineTo(toMiniX(tgt.x), toMiniY(tgt.y));
      ctx.stroke();
    });

    // Draw nodes
    nodes.forEach((node) => {
      if (node.data("is_cluster")) return;
      const pos = node.position();
      const x = toMiniX(pos.x);
      const y = toMiniY(pos.y);

      let color = "#3b82f6"; // default
      if (node.data("is_coinbase")) color = "#64748b";
      else if (node.data("has_label")) color = "#22c55e";
      if (node.selected()) color = "#f7931a";

      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    });

    // Draw viewport rectangle
    const ext = cy.extent();
    const vx1 = toMiniX(ext.x1);
    const vy1 = toMiniY(ext.y1);
    const vx2 = toMiniX(ext.x2);
    const vy2 = toMiniY(ext.y2);

    ctx.strokeStyle = "rgba(59, 130, 246, 0.7)";
    ctx.lineWidth = 1.5;
    ctx.fillStyle = "rgba(59, 130, 246, 0.08)";
    ctx.beginPath();
    ctx.rect(vx1, vy1, vx2 - vx1, vy2 - vy1);
    ctx.fill();
    ctx.stroke();
  }, [cy]);

  const scheduleDraw = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(draw);
  }, [draw]);

  useEffect(() => {
    if (!cy) return;
    scheduleDraw();

    const events = "viewport position layoutstop add remove select unselect";
    cy.on(events, scheduleDraw);
    return () => {
      cy.off(events, undefined, scheduleDraw);
      cancelAnimationFrame(rafRef.current);
    };
  }, [cy, scheduleDraw]);

  const panToPosition = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!cy) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const nodes = cy.nodes();
      if (nodes.length === 0) return;

      const bb = cy.elements().boundingBox();
      const graphW = bb.w || 1;
      const graphH = bb.h || 1;
      const drawW = MINIMAP_W - PADDING * 2;
      const drawH = MINIMAP_H - PADDING * 2;
      const scale = Math.min(drawW / graphW, drawH / graphH);
      const offsetX = PADDING + (drawW - graphW * scale) / 2;
      const offsetY = PADDING + (drawH - graphH * scale) / 2;

      const graphX = bb.x1 + (mx - offsetX) / scale;
      const graphY = bb.y1 + (my - offsetY) / scale;

      cy.center({ eles: cy.collection(), x: graphX, y: graphY } as any);
      // Pan to center on the clicked position
      const zoom = cy.zoom();
      const containerW = cy.width();
      const containerH = cy.height();
      cy.pan({
        x: containerW / 2 - graphX * zoom,
        y: containerH / 2 - graphY * zoom,
      });
    },
    [cy]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      isDragging.current = true;
      panToPosition(e);
    },
    [panToPosition]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (isDragging.current) panToPosition(e);
    },
    [panToPosition]
  );

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  return (
    <div className="absolute top-3 right-3 z-10 glass rounded-lg overflow-hidden border border-border/30">
      <canvas
        ref={canvasRef}
        width={MINIMAP_W}
        height={MINIMAP_H}
        style={{ width: MINIMAP_W, height: MINIMAP_H, display: "block", cursor: "crosshair" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  );
}
