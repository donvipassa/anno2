import { useState, useCallback } from 'react';
import { BoundingBox } from '../../types';
import { clampToImageBounds } from '../../utils';
import { getResizeHandle } from '../../utils/canvas';

interface ResizeState {
  isResizing: boolean;
  resizeHandle: string | null;
  resizeStart: { x: number; y: number } | null;
  resizingObjectId: string | null;
  originalBbox: BoundingBox | null;
}

export const useCanvasResize = (
  boundingBoxes: BoundingBox[],
  imageWidth: number,
  imageHeight: number,
  scale: number,
  updateBoundingBox: (id: string, updates: Partial<BoundingBox>) => void
) => {
  const [resizeState, setResizeState] = useState<ResizeState>({
    isResizing: false,
    resizeHandle: null,
    resizeStart: null,
    resizingObjectId: null,
    originalBbox: null
  });

  const startResize = useCallback((
    x: number,
    y: number,
    bbox: BoundingBox,
    handle: string
  ) => {
    setResizeState({
      isResizing: true,
      resizeHandle: handle,
      resizeStart: { x, y },
      resizingObjectId: bbox.id,
      originalBbox: { ...bbox }
    });
  }, []);

  const updateResize = useCallback((x: number, y: number) => {
    if (!resizeState.isResizing || !resizeState.resizeStart || !resizeState.originalBbox) return;

    const bbox = resizeState.originalBbox;

    const deltaX = x - resizeState.resizeStart.x;
    const deltaY = y - resizeState.resizeStart.y;

    let newBbox = { ...bbox };

    switch (resizeState.resizeHandle) {
      case 'nw':
        newBbox.width = Math.max(10, bbox.width - deltaX);
        newBbox.height = Math.max(10, bbox.height - deltaY);
        newBbox.x = bbox.x + (bbox.width - newBbox.width);
        newBbox.y = bbox.y + (bbox.height - newBbox.height);
        break;
      case 'n':
        newBbox.height = Math.max(10, bbox.height - deltaY);
        newBbox.y = bbox.y + (bbox.height - newBbox.height);
        break;
      case 'ne':
        newBbox.width = Math.max(10, bbox.width + deltaX);
        newBbox.height = Math.max(10, bbox.height - deltaY);
        newBbox.y = bbox.y + (bbox.height - newBbox.height);
        break;
      case 'e':
        newBbox.width = Math.max(10, bbox.width + deltaX);
        break;
      case 'se':
        newBbox.width = Math.max(10, bbox.width + deltaX);
        newBbox.height = Math.max(10, bbox.height + deltaY);
        break;
      case 's':
        newBbox.height = Math.max(10, bbox.height + deltaY);
        break;
      case 'sw':
        newBbox.width = Math.max(10, bbox.width - deltaX);
        newBbox.height = Math.max(10, bbox.height + deltaY);
        newBbox.x = bbox.x + (bbox.width - newBbox.width);
        break;
      case 'w':
        newBbox.width = Math.max(10, bbox.width - deltaX);
        newBbox.x = bbox.x + (bbox.width - newBbox.width);
        break;
    }

    if (newBbox.x < 0) {
      newBbox.width = newBbox.width + newBbox.x;
      newBbox.x = 0;
    }
    if (newBbox.y < 0) {
      newBbox.height = newBbox.height + newBbox.y;
      newBbox.y = 0;
    }
    if (newBbox.x + newBbox.width > imageWidth) {
      newBbox.width = imageWidth - newBbox.x;
    }
    if (newBbox.y + newBbox.height > imageHeight) {
      newBbox.height = imageHeight - newBbox.y;
    }

    newBbox.width = Math.max(10, newBbox.width);
    newBbox.height = Math.max(10, newBbox.height);

    updateBoundingBox(resizeState.resizingObjectId!, newBbox);
  }, [resizeState, imageWidth, imageHeight, updateBoundingBox]);

  const stopResize = useCallback(() => {
    setResizeState({
      isResizing: false,
      resizeHandle: null,
      resizeStart: null,
      resizingObjectId: null,
      originalBbox: null
    });
  }, []);

  const getResizeHandleAtPoint = useCallback((x: number, y: number, bbox: BoundingBox) => {
    return getResizeHandle(x, y, bbox, scale);
  }, [scale]);

  return {
    isResizing: resizeState.isResizing,
    resizeHandle: resizeState.resizeHandle,
    resizingObjectId: resizeState.resizingObjectId,
    startResize,
    updateResize,
    stopResize,
    getResizeHandleAtPoint
  };
};
