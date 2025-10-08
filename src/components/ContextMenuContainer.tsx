import React from 'react';
import { AnnotationState, ImageState } from '../types';
import { saveImageAsFile } from '../utils';

interface ContextMenuContainerProps {
  visible: boolean;
  x: number;
  y: number;
  annotations: AnnotationState;
  imageState: ImageState;
  onClearDensityPoints: () => void;
  onClearRulers: () => void;
  onHide: () => void;
  getOriginalPixelColor: (x: number, y: number) => [number, number, number] | null;
}

export const ContextMenuContainer: React.FC<ContextMenuContainerProps> = ({
  visible,
  x,
  y,
  annotations,
  imageState,
  onClearDensityPoints,
  onClearRulers,
  onHide,
  getOriginalPixelColor
}) => {
  if (!visible) return null;

  return (
    <>
      <div
        className="fixed bg-white border border-gray-200 rounded shadow-lg z-50"
        style={{ left: x, top: y }}
      >
        <button
          className={`block w-full text-left px-4 py-2 text-sm ${
            annotations.densityPoints.length === 0
              ? 'text-gray-400 cursor-not-allowed'
              : 'hover:bg-gray-100 text-gray-900'
          }`}
          onClick={() => {
            if (annotations.densityPoints.length > 0) {
              onClearDensityPoints();
              onHide();
            }
          }}
          disabled={annotations.densityPoints.length === 0}
        >
          Очистить все измерения плотности
        </button>
        <button
          className={`block w-full text-left px-4 py-2 text-sm ${
            annotations.rulers.length === 0
              ? 'text-gray-400 cursor-not-allowed'
              : 'hover:bg-gray-100 text-gray-900'
          }`}
          onClick={() => {
            if (annotations.rulers.length > 0) {
              onClearRulers();
              onHide();
            }
          }}
          disabled={annotations.rulers.length === 0}
        >
          Очистить все линейки
        </button>
        <button
          className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
          onClick={() => {
            if (imageState.imageElement && imageState.file) {
              saveImageAsFile(
                imageState.imageElement,
                imageState.width,
                imageState.height,
                annotations,
                `annotated_${imageState.file.name}`,
                getOriginalPixelColor
              );
            }
            onHide();
          }}
          disabled={!imageState.src}
        >
          Сохранить изображение
        </button>
      </div>
      <div className="fixed inset-0 z-40" onClick={onHide} />
    </>
  );
};
