import { useCallback } from 'react';
import { useImage } from '../core/ImageProvider';
import { useAnnotations } from '../core/AnnotationManager';
import { useCalibration } from '../core/CalibrationManager';
import { DEFECT_CLASSES } from '../types';
import { calculateDistance } from '../utils';
import { drawBoundingBox } from '../utils/canvas';
import jsonData from '../data/defect-classes.json';

export const useCanvasRendering = (
  layerVisible: boolean,
  filterActive: boolean,
  activeClassId: number,
  activeTool: string,
  isDrawing: boolean,
  currentBox: { x: number; y: number; width: number; height: number } | null,
  currentLine: { x1: number; y1: number; x2: number; y2: number } | null
) => {
  const { imageState, getOriginalPixelColor } = useImage();
  const { annotations } = useAnnotations();
  const { getLength } = useCalibration();

  const draw = useCallback((canvasRef: React.RefObject<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !imageState.imageElement) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Очищаем canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Применяем трансформации
    ctx.save();
    ctx.translate(imageState.offsetX, imageState.offsetY);
    ctx.scale(imageState.scale, imageState.scale);

    // Рисуем изображение
    if (imageState.inverted) {
      ctx.filter = 'invert(1)';
    }
    ctx.drawImage(imageState.imageElement, 0, 0, imageState.width, imageState.height);
    ctx.filter = 'none';

    if (layerVisible) {
      // Рисуем bounding boxes
      annotations.boundingBoxes.forEach(bbox => {
        if (filterActive && activeClassId >= 0 && bbox.classId !== activeClassId) {
          return;
        }

        const isSelected = annotations.selectedObjectId === bbox.id && annotations.selectedObjectType === 'bbox';
        drawBoundingBox(ctx, bbox, isSelected, imageState.scale, DEFECT_CLASSES, jsonData, annotations.calibrationLine);
      });

      // Рисуем линейки
      ctx.strokeStyle = '#FFFF00';
      ctx.lineWidth = 2 / imageState.scale;
      annotations.rulers.forEach(ruler => {
        const isSelected = annotations.selectedObjectId === ruler.id && annotations.selectedObjectType === 'ruler';
        
        ctx.strokeStyle = isSelected ? '#FF0000' : '#FFFF00';
        ctx.lineWidth = (isSelected ? 3 : 2) / imageState.scale;
        
        ctx.beginPath();
        ctx.moveTo(ruler.x1, ruler.y1);
        ctx.lineTo(ruler.x2, ruler.y2);
        ctx.stroke();

        // Маркеры на концах
        const markerSize = 4 / imageState.scale;
        ctx.fillStyle = ctx.strokeStyle;
        ctx.beginPath();
        ctx.arc(ruler.x1, ruler.y1, markerSize, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ruler.x2, ruler.y2, markerSize, 0, 2 * Math.PI);
        ctx.fill();

        // Подпись с длиной
        const length = calculateDistance(ruler.x1, ruler.y1, ruler.x2, ruler.y2);
        const lengthInfo = annotations.calibrationLine ? (() => {
          const pixelLength = Math.sqrt(
            (annotations.calibrationLine.x2 - annotations.calibrationLine.x1) ** 2 + 
            (annotations.calibrationLine.y2 - annotations.calibrationLine.y1) ** 2
          );
          const scale = annotations.calibrationLine.realLength / pixelLength;
          return { value: length * scale, unit: 'мм' };
        })() : { value: length, unit: 'px' };
        const midX = (ruler.x1 + ruler.x2) / 2;
        const midY = (ruler.y1 + ruler.y2) / 2;
        
        ctx.fillStyle = '#FFFF00';
        ctx.font = `${Math.max(16 / imageState.scale, 12)}px Arial`;
        ctx.fillText(`${lengthInfo.value.toFixed(1)} ${lengthInfo.unit}`, midX, midY - 10 / imageState.scale);
      });

      // Рисуем калибровочную линию
      if (annotations.calibrationLine) {
        const line = annotations.calibrationLine;
        const isSelected = annotations.selectedObjectId === line.id && annotations.selectedObjectType === 'calibration';
        
        ctx.strokeStyle = isSelected ? '#FF0000' : '#0000FF';
        ctx.lineWidth = (isSelected ? 4 : 3) / imageState.scale;
        
        ctx.beginPath();
        ctx.moveTo(line.x1, line.y1);
        ctx.lineTo(line.x2, line.y2);
        ctx.stroke();

        // Маркеры на концах
        const markerSize = 5 / imageState.scale;
        ctx.fillStyle = ctx.strokeStyle;
        ctx.beginPath();
        ctx.arc(line.x1, line.y1, markerSize, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(line.x2, line.y2, markerSize, 0, 2 * Math.PI);
        ctx.fill();

        // Подпись с реальной длиной
        const midX = (line.x1 + line.x2) / 2;
        const midY = (line.y1 + line.y2) / 2;
        
        ctx.fillStyle = '#0000FF';
        ctx.font = `${Math.max(16 / imageState.scale, 12)}px Arial`;
        ctx.fillText(`${line.realLength} мм`, midX, midY - 10 / imageState.scale);
      }

      // Рисуем точки плотности
      annotations.densityPoints.forEach(point => {
        const isSelected = annotations.selectedObjectId === point.id && annotations.selectedObjectType === 'density';
        
        ctx.strokeStyle = isSelected ? '#FF0000' : '#FF00FF';
        ctx.lineWidth = (isSelected ? 3 : 2) / imageState.scale;

        // Крест
        const crossSize = 15 / imageState.scale;
        ctx.beginPath();
        ctx.moveTo(point.x - crossSize, point.y);
        ctx.lineTo(point.x + crossSize, point.y);
        ctx.moveTo(point.x, point.y - crossSize);
        ctx.lineTo(point.x, point.y + crossSize);
        ctx.stroke();

        // Значение плотности
        const originalColor = getOriginalPixelColor(point.x, point.y);
        if (originalColor) {
          const [r, g, b] = originalColor;
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          const density = 1 - (gray / 255);
          
          ctx.fillStyle = '#FF00FF';
          ctx.font = `${Math.max(16 / imageState.scale, 12)}px Arial`;
          ctx.fillText(`${density.toFixed(2)}`, point.x + 20 / imageState.scale, point.y - 5 / imageState.scale);
        }
      });
    }

    // Рисуем текущий объект в процессе создания
    if (isDrawing) {
      if (currentBox) {
        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 2 / imageState.scale;
        ctx.setLineDash([5 / imageState.scale, 5 / imageState.scale]);
        ctx.strokeRect(currentBox.x, currentBox.y, currentBox.width, currentBox.height);
        ctx.setLineDash([]);
      } else if (currentLine) {
        ctx.strokeStyle = activeTool === 'calibration' ? '#0000FF' : '#FFFF00';
        ctx.lineWidth = 2 / imageState.scale;
        ctx.setLineDash([5 / imageState.scale, 5 / imageState.scale]);
        ctx.beginPath();
        ctx.moveTo(currentLine.x1, currentLine.y1);
        ctx.lineTo(currentLine.x2, currentLine.y2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    ctx.restore();
  }, [
    imageState, 
    annotations, 
    layerVisible, 
    filterActive, 
    activeClassId, 
    isDrawing, 
    currentBox, 
    currentLine, 
    activeTool, 
    getOriginalPixelColor, 
    getLength
  ]);

  return { draw };
};