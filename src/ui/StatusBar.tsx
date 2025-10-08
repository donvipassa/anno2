import React, { useMemo } from 'react';
import { BoundingBox, CalibrationLine } from '../types';

interface StatusBarProps {
  markupFileName: string | null;
  imageFileName: string | null;
  imageScale: number;
  hasImage: boolean;
  calibrationLine: CalibrationLine | null;
  selectedObjectId: string | null;
  boundingBoxes: BoundingBox[];
}

export const StatusBar = React.memo<StatusBarProps>(function StatusBar({
  markupFileName,
  imageFileName,
  imageScale,
  hasImage,
  calibrationLine,
  selectedObjectId,
  boundingBoxes
}) {
  const selectedObject = useMemo(() => {
    return selectedObjectId
      ? boundingBoxes.find(bbox => bbox.id === selectedObjectId)
      : null;
  }, [selectedObjectId, boundingBoxes]);

  const scaleInfo = useMemo(() => {
    if (!hasImage) return '–';
    if (!calibrationLine) return 'Масштаб не задан';

    const pixelLength = Math.sqrt(
      (calibrationLine.x2 - calibrationLine.x1) ** 2 +
      (calibrationLine.y2 - calibrationLine.y1) ** 2
    );
    const scale = calibrationLine.realLength / pixelLength;
    return `Масштаб: ${scale.toFixed(4)} мм/px`;
  }, [hasImage, calibrationLine]);

  const selectedObjectSize = useMemo(() => {
    if (!selectedObject) return 'Размер: –';

    if (calibrationLine) {
      const pixelLength = Math.sqrt(
        (calibrationLine.x2 - calibrationLine.x1) ** 2 +
        (calibrationLine.y2 - calibrationLine.y1) ** 2
      );
      const scale = calibrationLine.realLength / pixelLength;
      const width = selectedObject.width * scale;
      const height = selectedObject.height * scale;
      return `Размер: ${width.toFixed(1)}x${height.toFixed(1)} мм`;
    } else {
      return `Размер: ${selectedObject.width.toFixed(0)}x${selectedObject.height.toFixed(0)} px`;
    }
  }, [selectedObject, calibrationLine]);

  return (
    <div className="bg-white border-t border-gray-200 px-4 py-2 text-sm text-gray-700">
      <div className="flex items-center space-x-4">
        <span>
          Изображение: {imageFileName || '–'}
        </span>

        <span>|</span>

        <span>
          Разметка: {markupFileName || '–'}
        </span>

        <span>|</span>

        <span>
          Масштаб: {hasImage ? `${Math.round(imageScale * 100)}%` : '–'}
        </span>

        <span>|</span>

        <span>
          {scaleInfo}
        </span>

        <span>|</span>

        <span>
          {selectedObjectSize}
        </span>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.markupFileName === nextProps.markupFileName &&
    prevProps.imageFileName === nextProps.imageFileName &&
    prevProps.imageScale === nextProps.imageScale &&
    prevProps.hasImage === nextProps.hasImage &&
    prevProps.calibrationLine === nextProps.calibrationLine &&
    prevProps.selectedObjectId === nextProps.selectedObjectId &&
    prevProps.boundingBoxes === nextProps.boundingBoxes
  );
});