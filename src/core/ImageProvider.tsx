import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { ImageState } from '../types';
import { scaleFromCenter, fitImageToCanvas, scaleFromPoint } from '../utils/canvas';

interface ImageContextType {
  imageState: ImageState;
  loadImage: (file: File) => Promise<void>;
  setScale: (scale: number) => void;
  setOffset: (offsetX: number, offsetY: number) => void;
  toggleInversion: () => void;
  resetView: () => void;
  fitToCanvas: (canvasWidth: number, canvasHeight: number) => void;
  zoomIn: (canvasWidth?: number, canvasHeight?: number) => void;
  zoomOut: (canvasWidth?: number, canvasHeight?: number) => void;
  zoomReset: (canvasWidth?: number, canvasHeight?: number) => void;
  zoomToPoint: (pointX: number, pointY: number, zoomIn: boolean, canvasWidth: number, canvasHeight: number) => void;
}

const ImageContext = createContext<ImageContextType | null>(null);

export const useImage = () => {
  const context = useContext(ImageContext);
  if (!context) {
    throw new Error('useImage must be used within ImageProvider');
  }
  return context;
};

export const ImageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [imageState, setImageState] = useState<ImageState>({
    file: null,
    src: null,
    width: 0,
    height: 0,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    inverted: false,
    imageElement: null
  });


  const loadImage = useCallback(async (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (file.size > 20 * 1024 * 1024) {
        reject(new Error('FILE_TOO_LARGE'));
        return;
      }

      const validTypes = ['image/jpeg', 'image/png', 'image/tiff', 'image/bmp'];
      if (!validTypes.includes(file.type)) {
        reject(new Error('INVALID_FORMAT'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          setImageState(prev => ({
            ...prev,
            file,
            src: e.target?.result as string,
            width: img.naturalWidth,
            height: img.naturalHeight,
            scale: 1,
            offsetX: 0,
            offsetY: 0,
            inverted: false,
            imageElement: img
          }));
          resolve();
        };
        img.onerror = () => reject(new Error('LOAD_ERROR'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('READ_ERROR'));
      reader.readAsDataURL(file);
    });
  }, []);

  const setScale = useCallback((scale: number) => {
    setImageState(prev => ({ ...prev, scale: Math.max(0.1, Math.min(10, scale)) }));
  }, []);

  const setOffset = useCallback((offsetX: number, offsetY: number) => {
    setImageState(prev => ({ ...prev, offsetX, offsetY }));
  }, []);

  const toggleInversion = useCallback(() => {
    setImageState(prev => ({ ...prev, inverted: !prev.inverted }));
  }, []);

  const resetView = useCallback(() => {
    setImageState(prev => ({ ...prev, scale: 1, offsetX: 0, offsetY: 0 }));
  }, []);

  const fitToCanvas = useCallback((canvasWidth: number, canvasHeight: number) => {
    if (!imageState.width || !imageState.height || !canvasWidth || !canvasHeight) return;

    const { scale, offsetX, offsetY } = fitImageToCanvas(
      imageState.width,
      imageState.height,
      canvasWidth,
      canvasHeight
    );

    setImageState(prev => ({
      ...prev,
      scale,
      offsetX,
      offsetY
    }));
  }, [imageState.width, imageState.height]);

  const zoomIn = useCallback((canvasWidth?: number, canvasHeight?: number) => {
    if (!imageState.width || !imageState.height) return;
    
    // Если размеры canvas не переданы, пытаемся получить их из DOM
    let cWidth = canvasWidth;
    let cHeight = canvasHeight;
    
    if (!cWidth || !cHeight) {
      const canvas = document.querySelector('canvas');
      if (!canvas) return;
      cWidth = canvas.clientWidth;
      cHeight = canvas.clientHeight;
    }
    
    const newScale = Math.min(10, imageState.scale * 1.2);
    const { offsetX: newOffsetX, offsetY: newOffsetY } = scaleFromCenter(
      imageState.scale,
      newScale,
      imageState.offsetX,
      imageState.offsetY,
      cWidth,
      cHeight,
      imageState.width,
      imageState.height
    );
    
    setImageState(prev => ({
      ...prev,
      scale: newScale,
      offsetX: newOffsetX,
      offsetY: newOffsetY
    }));
  }, [imageState]);

  const zoomOut = useCallback((canvasWidth?: number, canvasHeight?: number) => {
    if (!imageState.width || !imageState.height) return;
    
    // Если размеры canvas не переданы, пытаемся получить их из DOM
    let cWidth = canvasWidth;
    let cHeight = canvasHeight;
    
    if (!cWidth || !cHeight) {
      const canvas = document.querySelector('canvas');
      if (!canvas) return;
      cWidth = canvas.clientWidth;
      cHeight = canvas.clientHeight;
    }
    
    const newScale = Math.max(0.1, imageState.scale / 1.2);
    const { offsetX: newOffsetX, offsetY: newOffsetY } = scaleFromCenter(
      imageState.scale,
      newScale,
      imageState.offsetX,
      imageState.offsetY,
      cWidth,
      cHeight,
      imageState.width,
      imageState.height
    );
    
    setImageState(prev => ({
      ...prev,
      scale: newScale,
      offsetX: newOffsetX,
      offsetY: newOffsetY
    }));
  }, [imageState]);

  const zoomReset = useCallback((canvasWidth?: number, canvasHeight?: number) => {
    if (!imageState.width || !imageState.height) return;
    
    // Если размеры canvas не переданы, пытаемся получить их из DOM
    let cWidth = canvasWidth;
    let cHeight = canvasHeight;
    
    if (!cWidth || !cHeight) {
      const canvas = document.querySelector('canvas');
      if (!canvas) return;
      cWidth = canvas.clientWidth;
      cHeight = canvas.clientHeight;
    }
    
    const newScale = 1;
    const { offsetX: newOffsetX, offsetY: newOffsetY } = scaleFromCenter(
      imageState.scale,
      newScale,
      imageState.offsetX,
      imageState.offsetY,
      cWidth,
      cHeight,
      imageState.width,
      imageState.height
    );
    
    setImageState(prev => ({
      ...prev,
      scale: newScale,
      offsetX: newOffsetX,
      offsetY: newOffsetY
    }));
  }, [imageState]);

  const zoomToPoint = useCallback((pointX: number, pointY: number, zoomIn: boolean, canvasWidth: number, canvasHeight: number) => {
    if (!imageState.width || !imageState.height) return;
    
    const delta = zoomIn ? 1.1 : 0.9;
    const newScale = Math.max(0.1, Math.min(10, imageState.scale * delta));
    
    const { offsetX: newOffsetX, offsetY: newOffsetY } = scaleFromPoint(
      imageState.scale,
      newScale,
      imageState.offsetX,
      imageState.offsetY,
      pointX,
      pointY
    );
    
    setImageState(prev => ({
      ...prev,
      scale: newScale,
      offsetX: newOffsetX,
      offsetY: newOffsetY
    }));
  }, [imageState]);

  return (
    <ImageContext.Provider
      value={{
        imageState,
        loadImage,
        setScale,
        setOffset,
        toggleInversion,
        resetView,
        fitToCanvas,
        zoomIn,
        zoomOut,
        zoomReset,
        zoomToPoint
      }}
    >
      {children}
    </ImageContext.Provider>
  );
};