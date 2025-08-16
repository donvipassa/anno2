import React from 'react';
import { useImage } from '../core/ImageProvider';
import { useAnnotations } from '../core/AnnotationManager';
import { DEFECT_CLASSES } from '../types';

interface StatusBarProps {
  markupFileName: string | null;
}

export const StatusBar: React.FC<StatusBarProps> = ({ markupFileName }) => {
  const { imageState } = useImage();
  const { annotations } = useAnnotations();

  const selectedObject = annotations.selectedObjectId 
    ? annotations.boundingBoxes.find(bbox => bbox.id === annotations.selectedObjectId)
    : null;

  const getSelectedObjectSize = () => {
    if (!selectedObject) return 'Размер: –';
    
    if (annotations.calibrationLine) {
      const pixelLength = Math.sqrt(
        (annotations.calibrationLine.x2 - annotations.calibrationLine.x1) ** 2 + 
        (annotations.calibrationLine.y2 - annotations.calibrationLine.y1) ** 2
      );
      const scale = annotations.calibrationLine.realLength / pixelLength;
      const width = selectedObject.width * scale;
      const height = selectedObject.height * scale;
      return `Размер: ${width.toFixed(1)}x${height.toFixed(1)} мм`;
    } else {
      return `Размер: ${selectedObject.width.toFixed(0)}x${selectedObject.height.toFixed(0)} px`;
    }
  };

  return (
    <div className="bg-white border-t border-gray-200 px-4 py-2 text-sm text-gray-700">
      <div className="flex items-center space-x-4">
        <span>
          Изображение: {imageState.file ? imageState.file.name : '–'}
        </span>
        
        <span>|</span>
        
        <span>
          Разметка: {markupFileName || '–'}
        </span>
        
        <span>|</span>
        
        <span>
          Масштаб: {imageState.src ? `${Math.round(imageState.scale * 100)}%` : '–'}
        </span>
        
        <span>|</span>
        
        <span>
          {imageState.src
            ? (annotations.calibrationLine
                ? (() => {
                    const pixelLength = Math.sqrt(
                      (annotations.calibrationLine.x2 - annotations.calibrationLine.x1) ** 2 + 
                      (annotations.calibrationLine.y2 - annotations.calibrationLine.y1) ** 2
                    );
                    const scale = annotations.calibrationLine.realLength / pixelLength;
                    return `Масштаб: ${scale.toFixed(4)} мм/px`;
                  })()
                : 'Масштаб не задан')
            : '–'
          }
        </span>
        
        <span>|</span>
        
        <span>
          {getSelectedObjectSize()}
        </span>
      </div>
    </div>
  );
};