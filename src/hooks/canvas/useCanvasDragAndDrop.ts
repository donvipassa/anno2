import { useState, useCallback } from 'react';
import { BoundingBox, Ruler, CalibrationLine, DensityPoint } from '../../types';

interface DragState {
  isDragging: boolean;
  dragStart: { x: number; y: number } | null;
  draggedObjectId: string | null;
  draggedObjectType: string | null;
  lineHandle: 'start' | 'end' | null;
}

interface Annotations {
  boundingBoxes: BoundingBox[];
  rulers: Ruler[];
  calibrationLine: CalibrationLine | null;
  densityPoints: DensityPoint[];
}

export const useCanvasDragAndDrop = (
  annotations: Annotations,
  imageWidth: number,
  imageHeight: number,
  updateBoundingBox: (id: string, updates: Partial<BoundingBox>) => void,
  updateRuler: (id: string, updates: Partial<Ruler>) => void,
  updateCalibrationLine: (updates: Partial<CalibrationLine>) => void,
  updateDensityPoint: (id: string, updates: Partial<DensityPoint>) => void
) => {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragStart: null,
    draggedObjectId: null,
    draggedObjectType: null,
    lineHandle: null
  });

  const startDrag = useCallback((
    x: number,
    y: number,
    objectId: string,
    objectType: string,
    lineHandle?: 'start' | 'end'
  ) => {
    setDragState({
      isDragging: true,
      dragStart: { x, y },
      draggedObjectId: objectId,
      draggedObjectType: objectType,
      lineHandle: lineHandle || null
    });
  }, []);

  const updateDrag = useCallback((x: number, y: number) => {
    if (!dragState.isDragging || !dragState.dragStart || !dragState.draggedObjectId) return;

    const deltaX = x - dragState.dragStart.x;
    const deltaY = y - dragState.dragStart.y;

    if (dragState.draggedObjectType === 'bbox') {
      const bbox = annotations.boundingBoxes.find(b => b.id === dragState.draggedObjectId);
      if (bbox) {
        const newX = Math.max(0, Math.min(bbox.x + deltaX, imageWidth - bbox.width));
        const newY = Math.max(0, Math.min(bbox.y + deltaY, imageHeight - bbox.height));
        updateBoundingBox(bbox.id, { x: newX, y: newY });
      }
    } else if (dragState.draggedObjectType === 'ruler') {
      const ruler = annotations.rulers.find(r => r.id === dragState.draggedObjectId);
      if (ruler) {
        if (dragState.lineHandle === 'start') {
          updateRuler(ruler.id, {
            x1: Math.max(0, Math.min(x, imageWidth)),
            y1: Math.max(0, Math.min(y, imageHeight))
          });
        } else if (dragState.lineHandle === 'end') {
          updateRuler(ruler.id, {
            x2: Math.max(0, Math.min(x, imageWidth)),
            y2: Math.max(0, Math.min(y, imageHeight))
          });
        } else {
          const newX1 = Math.max(0, Math.min(ruler.x1 + deltaX, imageWidth));
          const newY1 = Math.max(0, Math.min(ruler.y1 + deltaY, imageHeight));
          const newX2 = Math.max(0, Math.min(ruler.x2 + deltaX, imageWidth));
          const newY2 = Math.max(0, Math.min(ruler.y2 + deltaY, imageHeight));
          updateRuler(ruler.id, {
            x1: newX1,
            y1: newY1,
            x2: newX2,
            y2: newY2
          });
        }
      }
    } else if (dragState.draggedObjectType === 'calibration') {
      if (annotations.calibrationLine) {
        if (dragState.lineHandle === 'start') {
          updateCalibrationLine({
            x1: Math.max(0, Math.min(x, imageWidth)),
            y1: Math.max(0, Math.min(y, imageHeight))
          });
        } else if (dragState.lineHandle === 'end') {
          updateCalibrationLine({
            x2: Math.max(0, Math.min(x, imageWidth)),
            y2: Math.max(0, Math.min(y, imageHeight))
          });
        } else {
          const newX1 = Math.max(0, Math.min(annotations.calibrationLine.x1 + deltaX, imageWidth));
          const newY1 = Math.max(0, Math.min(annotations.calibrationLine.y1 + deltaY, imageHeight));
          const newX2 = Math.max(0, Math.min(annotations.calibrationLine.x2 + deltaX, imageWidth));
          const newY2 = Math.max(0, Math.min(annotations.calibrationLine.y2 + deltaY, imageHeight));
          updateCalibrationLine({
            x1: newX1,
            y1: newY1,
            x2: newX2,
            y2: newY2
          });
        }
      }
    } else if (dragState.draggedObjectType === 'density') {
      const point = annotations.densityPoints.find(p => p.id === dragState.draggedObjectId);
      if (point) {
        updateDensityPoint(point.id, {
          x: Math.max(0, Math.min(x, imageWidth)),
          y: Math.max(0, Math.min(y, imageHeight))
        });
      }
    }

    if (!dragState.lineHandle) {
      setDragState(prev => ({ ...prev, dragStart: { x, y } }));
    }
  }, [
    dragState,
    annotations,
    imageWidth,
    imageHeight,
    updateBoundingBox,
    updateRuler,
    updateCalibrationLine,
    updateDensityPoint
  ]);

  const stopDrag = useCallback(() => {
    setDragState(prev => ({
      isDragging: false,
      dragStart: null,
      draggedObjectId: null,
      draggedObjectType: null,
      lineHandle: null
    }));
  }, []);

  return {
    isDragging: dragState.isDragging,
    draggedObjectId: dragState.draggedObjectId,
    draggedObjectType: dragState.draggedObjectType,
    lineHandle: dragState.lineHandle,
    startDrag,
    updateDrag,
    stopDrag
  };
};
