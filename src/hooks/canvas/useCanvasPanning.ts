import { useState, useCallback } from 'react';
import { ImageState } from '../../types';

interface PanningState {
  isPanning: boolean;
  panStart: { x: number; y: number; offsetX: number; offsetY: number } | null;
}

export const useCanvasPanning = (
  imageState: ImageState,
  setOffset: (offsetX: number, offsetY: number) => void
) => {
  const [panningState, setPanningState] = useState<PanningState>({
    isPanning: false,
    panStart: null
  });

  const startPanning = useCallback((clientX: number, clientY: number) => {
    setPanningState({
      isPanning: true,
      panStart: {
        x: clientX,
        y: clientY,
        offsetX: imageState.offsetX,
        offsetY: imageState.offsetY
      }
    });
  }, [imageState.offsetX, imageState.offsetY]);

  const updatePanning = useCallback((clientX: number, clientY: number) => {
    if (!panningState.isPanning || !panningState.panStart) return;

    const deltaX = clientX - panningState.panStart.x;
    const deltaY = clientY - panningState.panStart.y;
    setOffset(panningState.panStart.offsetX + deltaX, panningState.panStart.offsetY + deltaY);
  }, [panningState, setOffset]);

  const stopPanning = useCallback(() => {
    setPanningState({
      isPanning: false,
      panStart: null
    });
  }, []);

  return {
    isPanning: panningState.isPanning,
    startPanning,
    updatePanning,
    stopPanning
  };
};
