"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Stage, Layer, Rect, Text, Transformer, Group, Line } from "react-konva";
import type Konva from "konva";
import { SketchToolbar } from "@/components/sketch-toolbar";
import { SketchRoomDialog } from "@/components/sketch-room-dialog";
import { createFloorPlan, updateFloorPlan } from "@/lib/floor-plan-actions";
import type { SketchRoom } from "@/types";

// Scale: 1 foot = PIXELS_PER_FOOT px (at scale 1)
const PIXELS_PER_FOOT = 10;
// Grid snap size in px
const GRID_SNAP = 20;
// Zoom constants
const SCALE_STEP = 1.1;
const MIN_SCALE = 0.25;
const MAX_SCALE = 4;

function snapToGrid(val: number): number {
  return Math.round(val / GRID_SNAP) * GRID_SNAP;
}

function pxToFt(px: number): number {
  return Math.round((px / PIXELS_PER_FOOT) * 10) / 10;
}

function ftToPx(ft: number): number {
  return ft * PIXELS_PER_FOOT;
}

interface FloorPlanSketchProps {
  dealId: string;
  planId?: string;
  initialRooms?: SketchRoom[];
  /** floor label string (e.g. 'main', 'upper') */
  floorLabel: string;
  /** version string (e.g. 'as-is', 'proposed') */
  version: string;
  readOnly?: boolean;
  onSave?: () => void;
}

export function FloorPlanSketch({
  dealId,
  planId,
  initialRooms = [],
  floorLabel,
  version,
  readOnly = false,
  onSave,
}: FloorPlanSketchProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  const [rooms, setRooms] = useState<SketchRoom[]>(initialRooms);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stageScale, setStageScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [stageWidth, setStageWidth] = useState(600);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<SketchRoom | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Measure container width
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const update = () => {
      setStageWidth(container.offsetWidth || 600);
    };
    update();

    const ro = new ResizeObserver(update);
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  const stageHeight =
    typeof window !== "undefined" && window.innerWidth < 640 ? 400 : 600;

  // Sync transformer to selected node
  useEffect(() => {
    if (!transformerRef.current || !stageRef.current) return;
    if (selectedId) {
      const node = stageRef.current.findOne(`#${CSS.escape(selectedId)}`);
      if (node) {
        transformerRef.current.nodes([node]);
        transformerRef.current.getLayer()?.batchDraw();
      }
    } else {
      transformerRef.current.nodes([]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selectedId, rooms]);

  // Delete key handler
  useEffect(() => {
    if (readOnly) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        if (window.confirm("Delete this room?")) {
          setRooms((prev) => prev.filter((r) => r.id !== selectedId));
          setSelectedId(null);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedId, readOnly]);

  const totalSqft = rooms.reduce((sum, r) => sum + r.sqft, 0);

  // --- Grid lines ---
  function buildGrid() {
    const lines: React.ReactElement[] = [];
    const cols = Math.ceil(stageWidth / GRID_SNAP) + 2;
    const gridRows = Math.ceil(stageHeight / GRID_SNAP) + 2;
    for (let i = 0; i < cols; i++) {
      lines.push(
        <Line
          key={`v${i}`}
          points={[i * GRID_SNAP, 0, i * GRID_SNAP, stageHeight]}
          stroke="#e5e7eb"
          strokeWidth={0.5}
          listening={false}
        />
      );
    }
    for (let j = 0; j < gridRows; j++) {
      lines.push(
        <Line
          key={`h${j}`}
          points={[0, j * GRID_SNAP, stageWidth, j * GRID_SNAP]}
          stroke="#e5e7eb"
          strokeWidth={0.5}
          listening={false}
        />
      );
    }
    return lines;
  }

  // --- Wheel zoom ---
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const direction = e.evt.deltaY > 0 ? -1 : 1;
    let newScale =
      direction > 0 ? oldScale * SCALE_STEP : oldScale / SCALE_STEP;
    newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale));

    stage.scale({ x: newScale, y: newScale });
    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };
    stage.position(newPos);

    setStageScale(newScale);
    setStagePos(newPos);
  }, []);

  // --- Mobile pinch zoom ---
  const lastDistRef = useRef<number | null>(null);

  const handleTouchMove = useCallback(
    (e: Konva.KonvaEventObject<TouchEvent>) => {
      const touches = e.evt.touches;
      if (touches.length !== 2) return;
      e.evt.preventDefault();

      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (lastDistRef.current === null) {
        lastDistRef.current = dist;
        return;
      }

      const stage = stageRef.current;
      if (!stage) return;

      const scaleBy = dist / lastDistRef.current;
      lastDistRef.current = dist;

      const oldScale = stage.scaleX();
      let newScale = oldScale * scaleBy;
      newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale));

      stage.scale({ x: newScale, y: newScale });
      setStageScale(newScale);
    },
    []
  );

  const handleTouchEnd = useCallback(() => {
    lastDistRef.current = null;
  }, []);

  // --- Add room ---
  function handleAddRoom() {
    setEditingRoom(null);
    setDialogOpen(true);
  }

  function handleDialogSave(
    updates: Pick<SketchRoom, "label" | "lengthFt" | "widthFt" | "sqft">
  ) {
    if (editingRoom) {
      // Updating existing room — recalculate pixel dimensions from new feet values
      const newWidth = ftToPx(updates.lengthFt);
      const newHeight = ftToPx(updates.widthFt);
      setRooms((prev) =>
        prev.map((r) =>
          r.id === editingRoom.id
            ? { ...r, ...updates, width: newWidth, height: newHeight }
            : r
        )
      );
    } else {
      // Adding new room — place at a visible position near top-left
      const id = crypto.randomUUID();
      const newRoom: SketchRoom = {
        id,
        label: updates.label,
        x: snapToGrid(80),
        y: snapToGrid(80),
        width: ftToPx(updates.lengthFt),
        height: ftToPx(updates.widthFt),
        lengthFt: updates.lengthFt,
        widthFt: updates.widthFt,
        sqft: updates.sqft,
      };
      setRooms((prev) => [...prev, newRoom]);
    }
    setDialogOpen(false);
    setEditingRoom(null);
  }

  function handleDialogCancel() {
    setDialogOpen(false);
    setEditingRoom(null);
  }

  // --- Drag end: snap to grid ---
  function handleDragEnd(id: string, x: number, y: number) {
    setRooms((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, x: snapToGrid(x), y: snapToGrid(y) } : r
      )
    );
  }

  // --- Transform end: normalize scale, recalculate feet ---
  function handleTransformEnd(id: string, node: Konva.Node) {
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    const newWidth = Math.max(40, node.width() * scaleX);
    const newHeight = Math.max(40, node.height() * scaleY);
    // CRITICAL: reset scale to 1 after reading (Konva resize pattern)
    node.scaleX(1);
    node.scaleY(1);

    const newLengthFt = pxToFt(newWidth);
    const newWidthFt = pxToFt(newHeight);
    const newSqft = Math.round(newLengthFt * newWidthFt * 10) / 10;

    setRooms((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              x: snapToGrid(node.x()),
              y: snapToGrid(node.y()),
              width: newWidth,
              height: newHeight,
              lengthFt: newLengthFt,
              widthFt: newWidthFt,
              sqft: newSqft,
            }
          : r
      )
    );
  }

  // --- Stage click: deselect ---
  function handleStageClick(e: Konva.KonvaEventObject<MouseEvent>) {
    if (e.target === stageRef.current) {
      setSelectedId(null);
    }
  }

  // --- Save ---
  async function handleSave() {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const stage = stageRef.current;
      const fd = new FormData();
      fd.set("dealId", dealId);
      fd.set("floorLabel", floorLabel);
      fd.set("version", version);
      fd.set("sourceType", "sketch");
      fd.set("sketchData", JSON.stringify(rooms));
      fd.set("totalSqft", String(Math.round(totalSqft)));
      fd.set("naturalWidth", String(stage?.width() ?? stageWidth));
      fd.set("naturalHeight", String(stage?.height() ?? stageHeight));

      if (planId) {
        fd.set("planId", planId);
        await updateFloorPlan(fd);
      } else {
        await createFloorPlan(fd);
      }

      onSave?.();
    } catch (err) {
      console.error("Floor plan save error:", err);
      alert("Save failed. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  // --- Zoom controls ---
  function zoomIn() {
    const stage = stageRef.current;
    if (!stage) return;
    const newScale = Math.min(MAX_SCALE, stage.scaleX() * SCALE_STEP);
    stage.scale({ x: newScale, y: newScale });
    setStageScale(newScale);
  }

  function zoomOut() {
    const stage = stageRef.current;
    if (!stage) return;
    const newScale = Math.max(MIN_SCALE, stage.scaleX() / SCALE_STEP);
    stage.scale({ x: newScale, y: newScale });
    setStageScale(newScale);
  }

  function resetView() {
    const stage = stageRef.current;
    if (!stage) return;
    stage.scale({ x: 1, y: 1 });
    stage.position({ x: 0, y: 0 });
    setStageScale(1);
    setStagePos({ x: 0, y: 0 });
  }

  return (
    <div className="space-y-2">
      <SketchToolbar
        onAddRoom={handleAddRoom}
        onSave={handleSave}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onResetView={resetView}
        totalSqft={Math.round(totalSqft)}
        isSaving={isSaving}
        readOnly={readOnly}
      />

      <div
        ref={containerRef}
        className="border border-border rounded-lg overflow-hidden bg-white"
        style={{ height: `${stageHeight}px` }}
      >
        <Stage
          ref={stageRef}
          width={stageWidth}
          height={stageHeight}
          draggable={!readOnly}
          scaleX={stageScale}
          scaleY={stageScale}
          x={stagePos.x}
          y={stagePos.y}
          onWheel={handleWheel}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={handleStageClick}
          onDragEnd={(e) => {
            setStagePos({ x: e.target.x(), y: e.target.y() });
          }}
        >
          {/* Grid background layer */}
          <Layer listening={false}>{buildGrid()}</Layer>

          {/* Rooms layer */}
          <Layer>
            {rooms.map((room) => (
              <Group
                key={room.id}
                id={room.id}
                x={room.x}
                y={room.y}
                draggable={!readOnly}
                onDragEnd={(e) =>
                  handleDragEnd(room.id, e.target.x(), e.target.y())
                }
                dragBoundFunc={(pos) => ({
                  x: snapToGrid(pos.x),
                  y: snapToGrid(pos.y),
                })}
                onClick={(e) => {
                  e.cancelBubble = true;
                  setSelectedId(room.id);
                }}
                onDblClick={(e) => {
                  e.cancelBubble = true;
                  setEditingRoom(room);
                  setDialogOpen(true);
                }}
                onTransformEnd={(e) => handleTransformEnd(room.id, e.target)}
              >
                <Rect
                  width={room.width}
                  height={room.height}
                  fill="rgba(30,77,140,0.1)"
                  stroke="#1e4d8c"
                  strokeWidth={2}
                />
                <Text
                  x={8}
                  y={8}
                  text={`${room.label}\n${room.lengthFt}' x ${room.widthFt}'\n${room.sqft} sq ft`}
                  fontSize={11}
                  fill="#0f2645"
                  lineHeight={1.4}
                  listening={false}
                />
              </Group>
            ))}

            <Transformer
              ref={transformerRef}
              rotateEnabled={false}
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 40 || newBox.height < 40) return oldBox;
                return newBox;
              }}
            />
          </Layer>
        </Stage>
      </div>

      {rooms.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-4">
          Click &quot;Add Room&quot; to start sketching your floor plan.
        </p>
      )}

      <SketchRoomDialog
        room={editingRoom}
        open={dialogOpen}
        onSave={handleDialogSave}
        onCancel={handleDialogCancel}
      />
    </div>
  );
}
