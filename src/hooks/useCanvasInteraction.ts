import { useCallback, useMemo, useState } from 'react';
import { useImage } from '../core/ImageProvider';
import { useAnnotations } from '../core/AnnotationManager';
import { SIZES } from '../utils';
import { useCanvasDrawing } from './canvas/useCanvasDrawing';
import { useCanvasPanning } from './canvas/useCanvasPanning';
import { useCanvasSelection } from './canvas/useCanvasSelection';
import { useCanvasDragAndDrop } from './canvas/useCanvasDragAndDrop';
import { useCanvasResize } from './canvas/useCanvasResize';
import { calculateDistance } from '../utils';

export const useCanvasInteraction = (
  activeTool: string,
  activeClassId: number,
  onCalibrationLineFinished: (lineData: any, isNew: boolean) => void,
  onBboxCreated: (bboxData: any) => void,
  onShowContextMenu: (x: number, y: number) => void,
  onEditCalibration: () => void
) => {
  const { imageState, setOffset, zoomToPoint } = useImage();
  const {
    annotations,
    addRuler,
    updateRuler,
    addDensityPoint,
    updateDensityPoint,
    updateCalibrationLine,
    selectObject,
    updateBoundingBox
  } = useAnnotations();

  const [lastMouseCoords, setLastMouseCoords] = useState<{ x: number; y: number } | null>(null);

  const tolerances = useMemo(() => ({
    marker: SIZES.MARKER_TOLERANCE / imageState.scale,
    ruler: SIZES.RULER_TOLERANCE / imageState.scale,
    density: SIZES.DENSITY_POINT_TOLERANCE / imageState.scale,
    border: SIZES.BORDER_WIDTH / imageState.scale
  }), [imageState.scale]);

  const handleRulerCreated = useCallback((rulerData: { x1: number; y1: number; x2: number; y2: number }) => {
    const rulerId = addRuler(rulerData);
    selectObject(rulerId, 'ruler');
  }, [addRuler, selectObject]);

  const {
    isDrawing,
    currentBox,
    currentLine,
    startDrawing,
    updateDrawing,
    finishDrawing
  } = useCanvasDrawing(
    activeTool,
    activeClassId,
    imageState.width,
    imageState.height,
    onBboxCreated,
    handleRulerCreated,
    onCalibrationLineFinished,
    !!annotations.calibrationLine
  );

  const { isPanning, startPanning, updatePanning, stopPanning } = useCanvasPanning(
    imageState,
    setOffset
  );

  const { getObjectAtPoint, updateHoveredObject } = useCanvasSelection(annotations, tolerances);

  const { isDragging, lineHandle, startDrag, updateDrag, stopDrag } = useCanvasDragAndDrop(
    annotations,
    imageState.width,
    imageState.height,
    updateBoundingBox,
    updateRuler,
    updateCalibrationLine,
    updateDensityPoint
  );

  const {
    isResizing,
    resizeHandle,
    startResize,
    updateResize,
    stopResize,
    getResizeHandleAtPoint
  } = useCanvasResize(
    annotations.boundingBoxes,
    imageState.width,
    imageState.height,
    imageState.scale,
    updateBoundingBox
  );

  const getImageCoords = useCallback((clientX: number, clientY: number, canvasRef: React.RefObject<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const canvasX = clientX - rect.left;
    const canvasY = clientY - rect.top;

    const imageX = (canvasX - imageState.offsetX) / imageState.scale;
    const imageY = (canvasY - imageState.offsetY) / imageState.scale;

    return { x: imageX, y: imageY };
  }, [imageState]);

  const getHoverCursor = useCallback((x: number, y: number) => {
    for (let i = annotations.densityPoints.length - 1; i >= 0; i--) {
      const point = annotations.densityPoints[i];
      const distance = calculateDistance(x, y, point.x, point.y);
      if (distance <= tolerances.density) {
        return 'pointer';
      }
    }

    if (annotations.calibrationLine) {
      const line = annotations.calibrationLine;
      const distToStart = calculateDistance(x, y, line.x1, line.y1);
      const distToEnd = calculateDistance(x, y, line.x2, line.y2);

      if (distToStart <= tolerances.marker || distToEnd <= tolerances.marker) {
        return 'pointer';
      }
    }

    for (let i = annotations.rulers.length - 1; i >= 0; i--) {
      const ruler = annotations.rulers[i];
      const distToStart = calculateDistance(x, y, ruler.x1, ruler.y1);
      const distToEnd = calculateDistance(x, y, ruler.x2, ruler.y2);

      if (distToStart <= tolerances.marker || distToEnd <= tolerances.marker) {
        return 'pointer';
      }
    }

    for (let i = annotations.boundingBoxes.length - 1; i >= 0; i--) {
      const bbox = annotations.boundingBoxes[i];
      if (annotations.selectedObjectId === bbox.id && annotations.selectedObjectType === 'bbox') {
        const handle = getResizeHandleAtPoint(x, y, bbox);
        if (handle && handle !== 'move') {
          const cursorMap: Record<string, string> = {
            'nw': 'nw-resize', 'n': 'n-resize', 'ne': 'ne-resize',
            'e': 'e-resize', 'se': 'se-resize', 's': 's-resize',
            'sw': 'sw-resize', 'w': 'w-resize'
          };
          return cursorMap[handle] || 'default';
        }
      }
    }

    for (let i = annotations.boundingBoxes.length - 1; i >= 0; i--) {
      const bbox = annotations.boundingBoxes[i];
      const isOnBorder = (
        (x >= bbox.x - tolerances.border && x <= bbox.x + bbox.width + tolerances.border &&
         y >= bbox.y - tolerances.border && y <= bbox.y + tolerances.border) ||
        (x >= bbox.x - tolerances.border && x <= bbox.x + bbox.width + tolerances.border &&
         y >= bbox.y + bbox.height - tolerances.border && y <= bbox.y + bbox.height + tolerances.border) ||
        (x >= bbox.x - tolerances.border && x <= bbox.x + tolerances.border &&
         y >= bbox.y - tolerances.border && y <= bbox.y + bbox.height + tolerances.border) ||
        (x >= bbox.x + bbox.width - tolerances.border && x <= bbox.x + bbox.width + tolerances.border &&
         y >= bbox.y - tolerances.border && y <= bbox.y + bbox.height + tolerances.border)
      );

      if (isOnBorder) {
        return 'move';
      }
    }

    if (annotations.calibrationLine) {
      const line = annotations.calibrationLine;
      const distance = Math.abs((line.y2 - line.y1) * x - (line.x2 - line.x1) * y + line.x2 * line.y1 - line.y2 * line.x1) /
                      Math.sqrt((line.y2 - line.y1) ** 2 + (line.x2 - line.x1) ** 2);

      if (distance <= tolerances.ruler &&
          x >= Math.min(line.x1, line.x2) - tolerances.ruler &&
          x <= Math.max(line.x1, line.x2) + tolerances.ruler &&
          y >= Math.min(line.y1, line.y2) - tolerances.ruler &&
          y <= Math.max(line.y1, line.y2) + tolerances.ruler) {
        const distToStart = calculateDistance(x, y, line.x1, line.y1);
        const distToEnd = calculateDistance(x, y, line.x2, line.y2);
        if (distToStart > tolerances.marker && distToEnd > tolerances.marker) {
          return 'move';
        }
      }
    }

    for (let i = annotations.rulers.length - 1; i >= 0; i--) {
      const ruler = annotations.rulers[i];
      const distance = Math.abs((ruler.y2 - ruler.y1) * x - (ruler.x2 - ruler.x1) * y + ruler.x2 * ruler.y1 - ruler.y2 * ruler.x1) /
                      Math.sqrt((ruler.y2 - ruler.y1) ** 2 + (ruler.x2 - ruler.x1) ** 2);

      if (distance <= tolerances.ruler &&
          x >= Math.min(ruler.x1, ruler.x2) - tolerances.ruler &&
          x <= Math.max(ruler.x1, ruler.x2) + tolerances.ruler &&
          y >= Math.min(ruler.y1, ruler.y2) - tolerances.ruler &&
          y <= Math.max(ruler.y1, ruler.y2) + tolerances.ruler) {
        const distToStart = calculateDistance(x, y, ruler.x1, ruler.y1);
        const distToEnd = calculateDistance(x, y, ruler.x2, ruler.y2);
        if (distToStart > tolerances.marker && distToEnd > tolerances.marker) {
          return 'move';
        }
      }
    }
    return 'default';
  }, [annotations, tolerances, getResizeHandleAtPoint]);

  const handleMouseDown = useCallback((e: React.MouseEvent, canvasRef: React.RefObject<HTMLCanvasElement>) => {
    if (!imageState.imageElement) return;

    const coords = getImageCoords(e.clientX, e.clientY, canvasRef);

    if (e.button === 2) {
      startPanning(e.clientX, e.clientY);
      return;
    }

    if (e.button === 0) {
      const clickedObject = getObjectAtPoint(coords.x, coords.y);

      if (clickedObject) {
        selectObject(clickedObject.object.id, clickedObject.type.split('-')[0] as any);

        if (clickedObject.type === 'bbox') {
          const handle = getResizeHandleAtPoint(coords.x, coords.y, clickedObject.object);
          if (handle && handle !== 'move') {
            startResize(coords.x, coords.y, clickedObject.object, handle);
            return;
          }
        }

        if (clickedObject.handle) {
          startDrag(coords.x, coords.y, clickedObject.object.id, clickedObject.type.split('-')[0], clickedObject.handle);
          return;
        }

        if (clickedObject.type === 'calibration' && e.detail === 2) {
          onEditCalibration();
          return;
        }

        startDrag(coords.x, coords.y, clickedObject.object.id, clickedObject.type.split('-')[0]);
      } else {
        selectObject(null, null);

        if (activeTool === 'bbox' && activeClassId >= 0) {
          startDrawing(coords.x, coords.y);
        } else if (activeTool === 'ruler' || activeTool === 'calibration') {
          startDrawing(coords.x, coords.y);
        } else if (activeTool === 'density') {
          const pointId = addDensityPoint({ x: coords.x, y: coords.y });
          selectObject(pointId, 'density');
        }
      }
    }
  }, [
    imageState,
    getImageCoords,
    getObjectAtPoint,
    selectObject,
    activeTool,
    activeClassId,
    addDensityPoint,
    startPanning,
    startDrag,
    startResize,
    startDrawing,
    getResizeHandleAtPoint,
    onEditCalibration
  ]);

  const handleMouseMove = useCallback((e: React.MouseEvent, canvasRef: React.RefObject<HTMLCanvasElement>) => {
    if (!imageState.imageElement) return;

    const coords = getImageCoords(e.clientX, e.clientY, canvasRef);
    setLastMouseCoords(coords);

    if (isPanning) {
      updatePanning(e.clientX, e.clientY);
      return;
    }

    if (isResizing) {
      updateResize(coords.x, coords.y);
      return;
    }

    if (isDragging) {
      updateDrag(coords.x, coords.y);
      return;
    }

    if (isDrawing) {
      updateDrawing(coords.x, coords.y);
      return;
    }

    updateHoveredObject(coords.x, coords.y);
  }, [
    imageState.imageElement,
    getImageCoords,
    isPanning,
    updatePanning,
    isResizing,
    updateResize,
    isDragging,
    updateDrag,
    isDrawing,
    updateDrawing,
    updateHoveredObject
  ]);

  const handleMouseUp = useCallback((e: React.MouseEvent, canvasRef: React.RefObject<HTMLCanvasElement>) => {
    if (isPanning) {
      stopPanning();
      return;
    }

    if (isResizing) {
      stopResize();
      return;
    }

    if (isDragging) {
      stopDrag();
      return;
    }

    if (isDrawing) {
      finishDrawing();
    }
  }, [isPanning, stopPanning, isResizing, stopResize, isDragging, stopDrag, isDrawing, finishDrawing]);

  const handleWheel = useCallback((e: React.WheelEvent, canvasRef: React.RefObject<HTMLCanvasElement>) => {
    e.preventDefault();

    if (!imageState.imageElement) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const pointX = e.clientX - rect.left;
    const pointY = e.clientY - rect.top;

    const zoomIn = e.deltaY < 0;
    zoomToPoint(pointX, pointY, zoomIn, canvas.clientWidth, canvas.clientHeight);
  }, [imageState.imageElement, zoomToPoint]);

  const getCursor = useCallback(() => {
    if (isPanning) return 'grabbing';
    if (isResizing && resizeHandle) {
      const cursorMap: Record<string, string> = {
        'nw': 'nw-resize', 'n': 'n-resize', 'ne': 'ne-resize',
        'e': 'e-resize', 'se': 'se-resize', 's': 's-resize',
        'sw': 'sw-resize', 'w': 'w-resize'
      };
      return cursorMap[resizeHandle] || 'grabbing';
    }
    if (isDragging) {
      if (lineHandle) return 'pointer';
      return 'grabbing';
    }
    if (isDrawing) {
      if (activeTool === 'bbox' && activeClassId >= 0) return 'crosshair';
      if (activeTool === 'ruler' || activeTool === 'calibration') return 'crosshair';
      if (activeTool === 'density') return 'crosshair';
    }

    if (!isDragging && !isPanning && !isDrawing && imageState.imageElement && lastMouseCoords) {
      return getHoverCursor(lastMouseCoords.x, lastMouseCoords.y);
    }

    if (activeTool === 'bbox' && activeClassId >= 0) return 'crosshair';
    if (activeTool === 'ruler' || activeTool === 'calibration') return 'crosshair';
    if (activeTool === 'density') return 'crosshair';

    return 'default';
  }, [
    isPanning,
    isResizing,
    resizeHandle,
    isDragging,
    lineHandle,
    isDrawing,
    activeTool,
    activeClassId,
    imageState.imageElement,
    lastMouseCoords,
    getHoverCursor
  ]);

  return {
    isDrawing,
    currentBox,
    currentLine,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    getCursor,
    handleContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
      onShowContextMenu(e.clientX, e.clientY);
    }
  };
};
