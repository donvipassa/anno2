import { useState, useCallback } from 'react';
import { BoundingBox } from '../../types';
import { calculateDistance, clampToImageBounds, normalizeBox } from '../../utils';

interface DrawingState {
  isDrawing: boolean;
  currentBox: { x: number; y: number; width: number; height: number } | null;
  currentLine: { x1: number; y1: number; x2: number; y2: number } | null;
}

export const useCanvasDrawing = (
  activeTool: string,
  activeClassId: number,
  imageWidth: number,
  imageHeight: number,
  onBboxCreated: (bboxData: Omit<BoundingBox, 'id' | 'defectRecord' | 'formattedDefectString'>) => void,
  onRulerCreated: (rulerData: { x1: number; y1: number; x2: number; y2: number }) => void,
  onCalibrationLineCreated: (lineData: { x1: number; y1: number; x2: number; y2: number; realLength: number }, isNew: boolean) => void,
  hasCalibrationLine: boolean
) => {
  const [drawingState, setDrawingState] = useState<DrawingState>({
    isDrawing: false,
    currentBox: null,
    currentLine: null
  });

  const startDrawing = useCallback((x: number, y: number) => {
    if (activeTool === 'bbox' && activeClassId >= 0) {
      setDrawingState({
        isDrawing: true,
        currentBox: { x, y, width: 0, height: 0 },
        currentLine: null
      });
    } else if (activeTool === 'ruler' || activeTool === 'calibration') {
      setDrawingState({
        isDrawing: true,
        currentBox: null,
        currentLine: { x1: x, y1: y, x2: x, y2: y }
      });
    }
  }, [activeTool, activeClassId]);

  const updateDrawing = useCallback((x: number, y: number) => {
    if (!drawingState.isDrawing) return;

    const clampedX = Math.max(0, Math.min(x, imageWidth));
    const clampedY = Math.max(0, Math.min(y, imageHeight));

    if (drawingState.currentBox) {
      const width = clampedX - drawingState.currentBox.x;
      const height = clampedY - drawingState.currentBox.y;
      setDrawingState(prev => ({
        ...prev,
        currentBox: prev.currentBox ? { ...prev.currentBox, width, height } : null
      }));
    } else if (drawingState.currentLine) {
      setDrawingState(prev => ({
        ...prev,
        currentLine: prev.currentLine ? { ...prev.currentLine, x2: clampedX, y2: clampedY } : null
      }));
    }
  }, [drawingState.isDrawing, drawingState.currentBox, drawingState.currentLine, imageWidth, imageHeight]);

  const finishDrawing = useCallback(() => {
    if (!drawingState.isDrawing) return;

    if (drawingState.currentBox && Math.abs(drawingState.currentBox.width) > 10 && Math.abs(drawingState.currentBox.height) > 10) {
      const normalized = normalizeBox(drawingState.currentBox);
      const clamped = clampToImageBounds(
        normalized.x,
        normalized.y,
        normalized.width,
        normalized.height,
        imageWidth,
        imageHeight
      );

      onBboxCreated({
        ...clamped,
        classId: activeClassId
      });
    } else if (drawingState.currentLine) {
      const distance = calculateDistance(
        drawingState.currentLine.x1,
        drawingState.currentLine.y1,
        drawingState.currentLine.x2,
        drawingState.currentLine.y2
      );

      if (distance > 5) {
        if (activeTool === 'ruler') {
          onRulerCreated(drawingState.currentLine);
        } else if (activeTool === 'calibration') {
          const lineData = {
            ...drawingState.currentLine,
            realLength: 50
          };
          onCalibrationLineCreated(lineData, !hasCalibrationLine);
        }
      }
    }

    setDrawingState({
      isDrawing: false,
      currentBox: null,
      currentLine: null
    });
  }, [
    drawingState,
    imageWidth,
    imageHeight,
    activeClassId,
    activeTool,
    hasCalibrationLine,
    onBboxCreated,
    onRulerCreated,
    onCalibrationLineCreated
  ]);

  const cancelDrawing = useCallback(() => {
    setDrawingState({
      isDrawing: false,
      currentBox: null,
      currentLine: null
    });
  }, []);

  return {
    isDrawing: drawingState.isDrawing,
    currentBox: drawingState.currentBox,
    currentLine: drawingState.currentLine,
    startDrawing,
    updateDrawing,
    finishDrawing,
    cancelDrawing
  };
};
