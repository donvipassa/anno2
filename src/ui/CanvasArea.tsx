import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useImage } from '../core/ImageProvider';
import { useAnnotations } from '../core/AnnotationManager';
import { useCalibration } from '../core/CalibrationManager';
import { DEFECT_CLASSES } from '../types';

interface CanvasAreaProps {
  activeTool: string;
  activeClassId: number;
  layerVisible: boolean;
  filterActive: boolean;
  onToolChange: (tool: string) => void;
  onSelectClass: (classId: number) => void;
  onShowContextMenu: (x: number, y: number) => void;
}

export const CanvasArea: React.FC<CanvasAreaProps> = ({
  activeTool,
  activeClassId,
  layerVisible,
  filterActive,
  onToolChange,
  onSelectClass,
  onShowContextMenu
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { imageState, setOffset, zoomToPoint } = useImage();
  const { 
    annotations, 
    addBoundingBox, 
    updateBoundingBox, 
    deleteBoundingBox,
    addRuler,
    updateRuler,
    deleteRuler,
    setCalibrationLine,
    updateCalibrationLine,
    deleteCalibrationLine,
    addDensityPoint,
    updateDensityPoint,
    deleteDensityPoint,
    selectObject 
  } = useAnnotations();
  const { getLength, setScale: setCalibrationScale } = useCalibration();
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [currentBox, setCurrentBox] = useState<any>(null);
  const [currentLine, setCurrentLine] = useState<any>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPosition, setLastPanPosition] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string>('');
  const [showCalibrationModal, setShowCalibrationModal] = useState(false);
  const [calibrationLength, setCalibrationLength] = useState('');
  const [pendingCalibrationLine, setPendingCalibrationLine] = useState<any>(null);

  // Получение координат изображения из координат мыши
  const getImageCoords = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const canvasX = clientX - rect.left;
    const canvasY = clientY - rect.top;

    const imageX = (canvasX - imageState.offsetX) / imageState.scale;
    const imageY = (canvasY - imageState.offsetY) / imageState.scale;

    return { x: imageX, y: imageY };
  }, [imageState]);

  // Получение координат canvas из координат изображения
  const getCanvasCoords = useCallback((imageX: number, imageY: number) => {
    return {
      x: imageState.offsetX + imageX * imageState.scale,
      y: imageState.offsetY + imageY * imageState.scale
    };
  }, [imageState]);

  // Проверка попадания в handle
  const getResizeHandle = useCallback((x: number, y: number, bbox: any) => {
    const canvasCoords = getCanvasCoords(bbox.x, bbox.y);
    const width = bbox.width * imageState.scale;
    const height = bbox.height * imageState.scale;
    const handleSize = 6;
    const tolerance = 3;

    const handles = [
      { name: 'nw', x: canvasCoords.x - handleSize/2, y: canvasCoords.y - handleSize/2 },
      { name: 'ne', x: canvasCoords.x + width - handleSize/2, y: canvasCoords.y - handleSize/2 },
      { name: 'se', x: canvasCoords.x + width - handleSize/2, y: canvasCoords.y + height - handleSize/2 },
      { name: 'sw', x: canvasCoords.x - handleSize/2, y: canvasCoords.y + height - handleSize/2 },
    ];

    for (const handle of handles) {
      if (x >= handle.x - tolerance && x <= handle.x + handleSize + tolerance &&
          y >= handle.y - tolerance && y <= handle.y + handleSize + tolerance) {
        return handle.name;
      }
    }
    return null;
  }, [getCanvasCoords, imageState.scale]);

  // Проверка попадания в bbox
  const getBboxAtPoint = useCallback((imageX: number, imageY: number) => {
    for (let i = annotations.boundingBoxes.length - 1; i >= 0; i--) {
      const bbox = annotations.boundingBoxes[i];
      if (imageX >= bbox.x && imageX <= bbox.x + bbox.width &&
          imageY >= bbox.y && imageY <= bbox.y + bbox.height) {
        return bbox;
      }
    }
    return null;
  }, [annotations.boundingBoxes]);

  // Проверка попадания в точку плотности
  const getDensityPointAtPoint = useCallback((imageX: number, imageY: number) => {
    const tolerance = 25; // Радиус области клика
    for (let i = annotations.densityPoints.length - 1; i >= 0; i--) {
      const point = annotations.densityPoints[i];
      const distance = Math.sqrt((imageX - point.x) ** 2 + (imageY - point.y) ** 2);
      if (distance <= tolerance) {
        return point;
      }
    }
    return null;
  }, [annotations.densityPoints]);

  // Проверка попадания в линейку
  const getRulerAtPoint = useCallback((imageX: number, imageY: number) => {
    const tolerance = 20; // Расстояние от линии
    for (let i = annotations.rulers.length - 1; i >= 0; i--) {
      const ruler = annotations.rulers[i];
      // Расстояние от точки до линии
      const A = imageY - ruler.y1;
      const B = ruler.x1 - imageX;
      const C = (imageX - ruler.x1) * (ruler.y2 - ruler.y1) - (imageY - ruler.y1) * (ruler.x2 - ruler.x1);
      const distance = Math.abs(C) / Math.sqrt(A * A + B * B);
      
      // Проверяем, что точка находится в пределах отрезка
      const dotProduct = (imageX - ruler.x1) * (ruler.x2 - ruler.x1) + (imageY - ruler.y1) * (ruler.y2 - ruler.y1);
      const squaredLength = (ruler.x2 - ruler.x1) ** 2 + (ruler.y2 - ruler.y1) ** 2;
      
      if (dotProduct >= 0 && dotProduct <= squaredLength && distance <= tolerance) {
        return ruler;
      }
    }
    return null;
  }, [annotations.rulers]);

  // Проверка попадания в калибровочную линию
  const getCalibrationLineAtPoint = useCallback((imageX: number, imageY: number) => {
    if (!annotations.calibrationLine) return null;
    
    const line = annotations.calibrationLine;
    const tolerance = 20;
    
    const A = imageY - line.y1;
    const B = line.x1 - imageX;
    const C = (imageX - line.x1) * (line.y2 - line.y1) - (imageY - line.y1) * (line.x2 - line.x1);
    const distance = Math.abs(C) / Math.sqrt(A * A + B * B);
    
    const dotProduct = (imageX - line.x1) * (line.x2 - line.x1) + (imageY - line.y1) * (line.y2 - line.y1);
    const squaredLength = (line.x2 - line.x1) ** 2 + (line.y2 - line.y1) ** 2;
    
    if (dotProduct >= 0 && dotProduct <= squaredLength && distance <= tolerance) {
      return line;
    }
    return null;
  }, [annotations.calibrationLine]);

  // Отрисовка canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageState.imageElement) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Очистка canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Отрисовка изображения
    const scaledWidth = imageState.width * imageState.scale;
    const scaledHeight = imageState.height * imageState.scale;

    ctx.save();
    if (imageState.inverted) {
      ctx.filter = 'invert(1)';
    }

    ctx.drawImage(
      imageState.imageElement,
      imageState.offsetX,
      imageState.offsetY,
      scaledWidth,
      scaledHeight
    );
    ctx.restore();

    if (!layerVisible) return;

    // Отрисовка bounding boxes
    annotations.boundingBoxes.forEach(bbox => {
      if (filterActive && activeClassId !== bbox.classId) return;

      const defectClass = DEFECT_CLASSES.find(c => c.id === bbox.classId);
      if (!defectClass) return;

      const canvasCoords = getCanvasCoords(bbox.x, bbox.y);
      const width = bbox.width * imageState.scale;
      const height = bbox.height * imageState.scale;

      ctx.strokeStyle = defectClass.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(canvasCoords.x, canvasCoords.y, width, height);

      // Подпись
      ctx.fillStyle = defectClass.color;
      ctx.font = '12px Arial';
      ctx.fillText(defectClass.name, canvasCoords.x, canvasCoords.y - 5);

      // Handles для выделенного объекта
      if (annotations.selectedObjectId === bbox.id) {
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;

        const handleSize = 6;
        const handles = [
          { x: canvasCoords.x - handleSize/2, y: canvasCoords.y - handleSize/2 },
          { x: canvasCoords.x + width - handleSize/2, y: canvasCoords.y - handleSize/2 },
          { x: canvasCoords.x + width - handleSize/2, y: canvasCoords.y + height - handleSize/2 },
          { x: canvasCoords.x - handleSize/2, y: canvasCoords.y + height - handleSize/2 },
        ];

        handles.forEach(handle => {
          ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
          ctx.strokeRect(handle.x, handle.y, handleSize, handleSize);
        });
      }
    });

    // Отрисовка линеек
    annotations.rulers.forEach(ruler => {
      const start = getCanvasCoords(ruler.x1, ruler.y1);
      const end = getCanvasCoords(ruler.x2, ruler.y2);

      ctx.strokeStyle = '#FFFF00';
      ctx.lineWidth = annotations.selectedObjectId === ruler.id ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();

      // Маркеры на концах
      ctx.fillStyle = '#FFFF00';
      ctx.beginPath();
      ctx.arc(start.x, start.y, 3, 0, 2 * Math.PI);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(end.x, end.y, 3, 0, 2 * Math.PI);
      ctx.fill();

      // Выделение для выбранной линейки
      if (annotations.selectedObjectId === ruler.id) {
        // Маркеры на концах для выделенной линейки
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        
        const handleSize = 8;
        // Маркер на начале
        ctx.fillRect(start.x - handleSize/2, start.y - handleSize/2, handleSize, handleSize);
        ctx.strokeRect(start.x - handleSize/2, start.y - handleSize/2, handleSize, handleSize);
        // Маркер на конце
        ctx.fillRect(end.x - handleSize/2, end.y - handleSize/2, handleSize, handleSize);
        ctx.strokeRect(end.x - handleSize/2, end.y - handleSize/2, handleSize, handleSize);
      }

      // Длина
      const pixelLength = Math.sqrt((ruler.x2 - ruler.x1) ** 2 + (ruler.y2 - ruler.y1) ** 2);
      const length = getLength(pixelLength);
      ctx.fillStyle = '#FFFF00';
      ctx.font = '12px Arial';
      const text = `${length.value.toFixed(1)} ${length.unit}`;
      const textWidth = ctx.measureText(text).width;
      ctx.fillText(text, (start.x + end.x) / 2 - textWidth / 2, (start.y + end.y) / 2 - 5);
    });

    // Отрисовка линии калибровки
    if (annotations.calibrationLine) {
      const line = annotations.calibrationLine;
      const start = getCanvasCoords(line.x1, line.y1);
      const end = getCanvasCoords(line.x2, line.y2);

      ctx.strokeStyle = '#0000FF';
      ctx.lineWidth = annotations.selectedObjectId === line.id ? 4 : 3;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();

      // Маркеры на концах
      ctx.fillStyle = '#0000FF';
      ctx.beginPath();
      ctx.arc(start.x, start.y, 4, 0, 2 * Math.PI);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(end.x, end.y, 4, 0, 2 * Math.PI);
      ctx.fill();

      // Выделение для выбранной калибровочной линии
      if (annotations.selectedObjectId === line.id) {
        // Маркеры на концах для выделенной калибровочной линии
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        
        const handleSize = 10;
        // Маркер на начале
        ctx.fillRect(start.x - handleSize/2, start.y - handleSize/2, handleSize, handleSize);
        ctx.strokeRect(start.x - handleSize/2, start.y - handleSize/2, handleSize, handleSize);
        // Маркер на конце
        ctx.fillRect(end.x - handleSize/2, end.y - handleSize/2, handleSize, handleSize);
        ctx.strokeRect(end.x - handleSize/2, end.y - handleSize/2, handleSize, handleSize);
      }

      ctx.fillStyle = '#0000FF';
      ctx.font = '12px Arial';
      const text = `${line.realLength.toFixed(1)} мм`;
      const textWidth = ctx.measureText(text).width;
      ctx.fillText(text, (start.x + end.x) / 2 - textWidth / 2, (start.y + end.y) / 2 - 5);
    }

    // Отрисовка точек плотности
    annotations.densityPoints.forEach(point => {
      const canvasCoords = getCanvasCoords(point.x, point.y);

      ctx.strokeStyle = '#FF00FF';
      ctx.lineWidth = annotations.selectedObjectId === point.id ? 3 : 2;

      // Крест
      ctx.beginPath();
      ctx.moveTo(canvasCoords.x - 10, canvasCoords.y);
      ctx.lineTo(canvasCoords.x + 10, canvasCoords.y);
      ctx.moveTo(canvasCoords.x, canvasCoords.y - 10);
      ctx.lineTo(canvasCoords.x, canvasCoords.y + 10);
      ctx.stroke();

      // Выделение для выбранной точки
      if (annotations.selectedObjectId === point.id) {
        // Маркеры вокруг выделенной точки плотности
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        
        const handleSize = 6;
        const offset = 20;
        // 4 маркера вокруг точки
        const markers = [
          { x: canvasCoords.x - offset, y: canvasCoords.y - offset }, // верх-лево
          { x: canvasCoords.x + offset, y: canvasCoords.y - offset }, // верх-право
          { x: canvasCoords.x + offset, y: canvasCoords.y + offset }, // низ-право
          { x: canvasCoords.x - offset, y: canvasCoords.y + offset }  // низ-лево
        ];
        
        markers.forEach(marker => {
          ctx.fillRect(marker.x - handleSize/2, marker.y - handleSize/2, handleSize, handleSize);
          ctx.strokeRect(marker.x - handleSize/2, marker.y - handleSize/2, handleSize, handleSize);
        });
      }

      // Значение плотности
      ctx.fillStyle = '#FF00FF';
      ctx.font = '12px Arial';
      ctx.fillText(`${point.density.toFixed(2)}`, canvasCoords.x + 15, canvasCoords.y - 5);
    });

    // Текущая рисуемая рамка
    if (isDrawing && currentBox && activeTool === 'bbox') {
      const defectClass = DEFECT_CLASSES.find(c => c.id === activeClassId);
      if (defectClass) {
        ctx.strokeStyle = defectClass.color;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(currentBox.x, currentBox.y, currentBox.width, currentBox.height);
        ctx.setLineDash([]);
      }
    }

    // Текущая рисуемая линия (линейка или калибровка)
    if (isDrawing && currentLine && (activeTool === 'ruler' || activeTool === 'calibration')) {
      const color = activeTool === 'ruler' ? '#FFFF00' : '#0000FF';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(currentLine.x1, currentLine.y1);
      ctx.lineTo(currentLine.x2, currentLine.y2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
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
    getLength, 
    getCanvasCoords
  ]);

  // Обработчики мыши
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!imageState.imageElement) return;

    if (e.button === 2) {
      // Правая кнопка мыши - начинаем панорамирование
      setIsPanning(true);
      setLastPanPosition({ x: e.clientX, y: e.clientY });
      return; // Предотвращаем дальнейшую обработку для ПКМ
    }

    if (e.button !== 0) return; // Только левая кнопка

    // Проверка на инструмент измерения плотности (приоритет над выделением bbox)
    if (e.button === 0 && activeTool === 'density') {
      const rect = canvasRef.current!.getBoundingClientRect();
      const canvasX = e.clientX - rect.left;
      const canvasY = e.clientY - rect.top;
      const coords = getImageCoords(e.clientX, e.clientY);
      
      // Проверка, что клик внутри изображения
      if (coords.x >= 0 && coords.x <= imageState.width && 
          coords.y >= 0 && coords.y <= imageState.height) {
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const imageData = ctx.getImageData(canvasX, canvasY, 1, 1);
            const r = imageData.data[0];
            const g = imageData.data[1];
            const b = imageData.data[2];
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            const density = 1 - (gray / 255);
            
            addDensityPoint({
              x: coords.x,
              y: coords.y,
              density: density
            });
          }
        }
      }
      return;
    }

    const rect = canvasRef.current!.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    const coords = getImageCoords(e.clientX, e.clientY);
    
    if (e.button === 0) { // ЛКМ
      // Проверка на выделенный bbox и его handles
      const selectedBbox = annotations.boundingBoxes.find(bbox => bbox.id === annotations.selectedObjectId);
      if (selectedBbox) {
        const handle = getResizeHandle(canvasX, canvasY, selectedBbox);
        if (handle) {
          setIsResizing(true);
          setResizeHandle(handle);
          setDragStart({ x: e.clientX, y: e.clientY });
          return;
        }
      }
      // Проверка на выделенный bbox и его handles
      // Проверка клика по точке плотности
      const clickedDensityPoint = getDensityPointAtPoint(coords.x, coords.y);
      if (clickedDensityPoint) {
        selectObject(clickedDensityPoint.id, 'density');
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
        return;
      }

      // Проверка клика по линейке
      const clickedRuler = getRulerAtPoint(coords.x, coords.y);
      if (clickedRuler) {
        selectObject(clickedRuler.id, 'ruler');
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
        return;
      }

      // Проверка клика по калибровочной линии
      const clickedCalibrationLine = getCalibrationLineAtPoint(coords.x, coords.y);
      if (clickedCalibrationLine) {
        selectObject(clickedCalibrationLine.id, 'calibration');
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
        return;
      }

      // Проверка клика по существующему bbox
      const clickedBbox = getBboxAtPoint(coords.x, coords.y);
      if (clickedBbox) {
        selectObject(clickedBbox.id, 'bbox');
        onSelectClass(clickedBbox.classId);
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
        return;
      }

      // Инструменты рисования
      if (activeTool === 'bbox' && activeClassId >= 0) {
        setIsDrawing(true);
        setStartPoint(coords);
        setCurrentBox({
          x: canvasX,
          y: canvasY,
          width: 0,
          height: 0
        });
      } else if (activeTool === 'ruler') {
        setIsDrawing(true);
        setStartPoint(coords);
        setCurrentLine({
          x1: canvasX,
          y1: canvasY,
          x2: canvasX,
          y2: canvasY
        });
      } else if (activeTool === 'calibration') {
        // Если калибровка уже существует, не начинаем новое рисование
        if (annotations.calibrationLine) {
          return;
        }
        setIsDrawing(true);
        setStartPoint(coords);
        setCurrentLine({
          x1: canvasX,
          y1: canvasY,
          x2: canvasX,
          y2: canvasY
        });
      } else {
        // Сброс выделения
        selectObject(null, null);
      }
    }
  }, [
    imageState.imageElement, 
    activeTool, 
    activeClassId, 
    getImageCoords, 
    annotations, 
    getBboxAtPoint,
    getResizeHandle,
    selectObject,
    onSelectClass,
    addDensityPoint,
    getDensityPointAtPoint,
    getRulerAtPoint,
    getCalibrationLineAtPoint,
    isDrawing
  ]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!imageState.imageElement) return;

    const rect = canvasRef.current!.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    const coords = getImageCoords(e.clientX, e.clientY);

    if (isPanning) {
      // Панорамирование изображения
      const deltaX = e.clientX - lastPanPosition.x;
      const deltaY = e.clientY - lastPanPosition.y;
      
      setOffset(
        imageState.offsetX + deltaX,
        imageState.offsetY + deltaY
      );
      
      setLastPanPosition({ x: e.clientX, y: e.clientY });
      return;
    }

    if (isDrawing && activeTool === 'bbox' && currentBox) {
      const startCanvasX = imageState.offsetX + startPoint.x * imageState.scale;
      const startCanvasY = imageState.offsetY + startPoint.y * imageState.scale;

      setCurrentBox({
        x: Math.min(startCanvasX, canvasX),
        y: Math.min(startCanvasY, canvasY),
        width: Math.abs(canvasX - startCanvasX),
        height: Math.abs(canvasY - startCanvasY)
      });
    } else if (isDrawing && (activeTool === 'ruler' || activeTool === 'calibration') && currentLine) {
      setCurrentLine({
        ...currentLine,
        x2: canvasX,
        y2: canvasY
      });
    } else if (isResizing && annotations.selectedObjectId) {
      const selectedBbox = annotations.boundingBoxes.find(bbox => bbox.id === annotations.selectedObjectId);
      if (selectedBbox) {
        const deltaX = (e.clientX - dragStart.x) / imageState.scale;
        const deltaY = (e.clientY - dragStart.y) / imageState.scale;

        let newBbox = { ...selectedBbox };

        switch (resizeHandle) {
          case 'nw':
            newBbox.x += deltaX;
            newBbox.y += deltaY;
            newBbox.width -= deltaX;
            newBbox.height -= deltaY;
            break;
          case 'ne':
            newBbox.y += deltaY;
            newBbox.width += deltaX;
            newBbox.height -= deltaY;
            break;
          case 'se':
            newBbox.width += deltaX;
            newBbox.height += deltaY;
            break;
          case 'sw':
            newBbox.x += deltaX;
            newBbox.width -= deltaX;
            newBbox.height += deltaY;
            break;
        }

        // Ограничения
        if (newBbox.width >= 10 && newBbox.height >= 10) {
          updateBoundingBox(selectedBbox.id, newBbox);
          setDragStart({ x: e.clientX, y: e.clientY });
        }
      }
    } else if (isDragging && !isResizing) {
      if (annotations.selectedObjectId && annotations.selectedObjectType === 'bbox') {
        // Перемещение bbox
        const selectedBbox = annotations.boundingBoxes.find(bbox => bbox.id === annotations.selectedObjectId);
        if (selectedBbox) {
          const deltaX = (e.clientX - dragStart.x) / imageState.scale;
          const deltaY = (e.clientY - dragStart.y) / imageState.scale;

          updateBoundingBox(selectedBbox.id, {
            x: selectedBbox.x + deltaX,
            y: selectedBbox.y + deltaY
          });
          setDragStart({ x: e.clientX, y: e.clientY });
        }
      } else if (annotations.selectedObjectId && annotations.selectedObjectType === 'density') {
        // Перемещение точки плотности
        const selectedPoint = annotations.densityPoints.find(point => point.id === annotations.selectedObjectId);
        if (selectedPoint) {
          const deltaX = (e.clientX - dragStart.x) / imageState.scale;
          const deltaY = (e.clientY - dragStart.y) / imageState.scale;

          updateDensityPoint(selectedPoint.id, {
            x: selectedPoint.x + deltaX,
            y: selectedPoint.y + deltaY
          });
          setDragStart({ x: e.clientX, y: e.clientY });
        }
      } else if (annotations.selectedObjectId && annotations.selectedObjectType === 'ruler') {
        // Перемещение линейки
        const selectedRuler = annotations.rulers.find(ruler => ruler.id === annotations.selectedObjectId);
        if (selectedRuler) {
          const deltaX = (e.clientX - dragStart.x) / imageState.scale;
          const deltaY = (e.clientY - dragStart.y) / imageState.scale;

          updateRuler(selectedRuler.id, {
            x1: selectedRuler.x1 + deltaX,
            y1: selectedRuler.y1 + deltaY,
            x2: selectedRuler.x2 + deltaX,
            y2: selectedRuler.y2 + deltaY
          });
          setDragStart({ x: e.clientX, y: e.clientY });
        }
      } else if (annotations.selectedObjectId && annotations.selectedObjectType === 'calibration') {
        // Перемещение калибровочной линии
        if (annotations.calibrationLine) {
          const deltaX = (e.clientX - dragStart.x) / imageState.scale;
          const deltaY = (e.clientY - dragStart.y) / imageState.scale;

          updateCalibrationLine({
            x1: annotations.calibrationLine.x1 + deltaX,
            y1: annotations.calibrationLine.y1 + deltaY,
            x2: annotations.calibrationLine.x2 + deltaX,
            y2: annotations.calibrationLine.y2 + deltaY
          });
          setDragStart({ x: e.clientX, y: e.clientY });
        }
      } else {
        // Обычное перетаскивание объектов (уже обработано выше)
      }
    }
  }, [
    imageState.imageElement,
    isDrawing,
    activeTool,
    currentBox,
    currentLine,
    startPoint,
    imageState,
    isResizing,
    isDragging,
    annotations,
    resizeHandle,
    dragStart,
    getImageCoords,
    updateBoundingBox,
    updateDensityPoint,
    updateRuler,
    updateCalibrationLine,
    setOffset
  ]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); // Подавляем стандартное контекстное меню браузера
    
    if (isPanning) {
      // Если было панорамирование, не показываем пользовательское контекстное меню
      return;
    }

    // Показываем пользовательское контекстное меню
    onShowContextMenu(e.clientX, e.clientY);
  }, [isPanning, onShowContextMenu]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const coords = getImageCoords(e.clientX, e.clientY);
    
    if (isPanning) {
      setIsPanning(false);
      setLastPanPosition({ x: 0, y: 0 });
      return; // Предотвращаем дальнейшую обработку для ПКМ
    }

    // Ограничение координат в пределах изображения
    const clampedStartPoint = {
      x: Math.max(0, Math.min(startPoint.x, imageState.width)),
      y: Math.max(0, Math.min(startPoint.y, imageState.height))
    };
    const clampedCoords = {
      x: Math.max(0, Math.min(coords.x, imageState.width)),
      y: Math.max(0, Math.min(coords.y, imageState.height))
    };

    if (e.button === 0 && isDrawing) {
      if (activeTool === 'bbox' && currentBox) {
        const minSize = 10;
        if (currentBox.width >= minSize && currentBox.height >= minSize) {
          const bbox = {
            classId: activeClassId,
            x: Math.min(clampedStartPoint.x, clampedCoords.x),
            y: Math.min(clampedStartPoint.y, clampedCoords.y),
            width: Math.abs(clampedCoords.x - clampedStartPoint.x),
            height: Math.abs(clampedCoords.y - clampedStartPoint.y)
          };
          
          const id = addBoundingBox(bbox);
          selectObject(id, 'bbox');
        }
      } else if (activeTool === 'ruler' && currentLine) {
        const pixelLength = Math.sqrt(
          (clampedCoords.x - clampedStartPoint.x) ** 2 + (clampedCoords.y - clampedStartPoint.y) ** 2
        );
        if (pixelLength >= 5) {
          addRuler({
            x1: clampedStartPoint.x,
            y1: clampedStartPoint.y,
            x2: clampedCoords.x,
            y2: clampedCoords.y
          });
        }
      } else if (activeTool === 'calibration' && currentLine) {
        const pixelLength = Math.sqrt(
          (clampedCoords.x - clampedStartPoint.x) ** 2 + (clampedCoords.y - clampedStartPoint.y) ** 2
        );
        if (pixelLength >= 5) {
          setPendingCalibrationLine({
            x1: clampedStartPoint.x,
            y1: clampedStartPoint.y,
            x2: clampedCoords.x,
            y2: clampedCoords.y,
            realLength: 0
          });
          setShowCalibrationModal(true);
        }
      }
    }

    // Сброс инструментов при одиночном клике по пустой области
    if (e.button === 0 && !isDrawing && !isDragging && !isResizing && 
        !annotations.selectedObjectId && activeTool !== 'density') {
      onToolChange('');
      onSelectClass(-1);
    }

    setIsDrawing(false);
    setCurrentBox(null);
    setCurrentLine(null);
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle('');
  }, [
    isDrawing,
    activeTool,
    currentBox,
    currentLine,
    activeClassId,
    startPoint,
    imageState.width,
    imageState.height,
    getImageCoords,
    addBoundingBox,
    addRuler,
    selectObject,
    isDragging,
    onShowContextMenu,
    annotations.selectedObjectId,
    isResizing,
    onToolChange,
    onSelectClass,
    dragStart
  ]);

  // Обработка колеса мыши для масштабирования
  const handleWheel = useCallback((e: React.WheelEvent) => {
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

  // Обработка модального окна калибровки
  const handleCalibrationSubmit = () => {
    const realLength = parseFloat(calibrationLength);
    if (realLength > 0 && pendingCalibrationLine) {
      const pixelLength = Math.sqrt(
        (pendingCalibrationLine.x2 - pendingCalibrationLine.x1) ** 2 + 
        (pendingCalibrationLine.y2 - pendingCalibrationLine.y1) ** 2
      );
      
      setCalibrationLine({
        ...pendingCalibrationLine,
        realLength: realLength
      });
      
      setCalibrationScale(pixelLength, realLength);
      
      setShowCalibrationModal(false);
      setCalibrationLength('');
      setPendingCalibrationLine(null);
    }
  };

  const handleCalibrationCancel = () => {
    setShowCalibrationModal(false);
    setCalibrationLength('');
    setPendingCalibrationLine(null);
  };

  // Обработка удаления объектов
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && annotations.selectedObjectId) {
        e.preventDefault();
        
        switch (annotations.selectedObjectType) {
          case 'bbox':
            deleteBoundingBox(annotations.selectedObjectId);
            break;
          case 'ruler':
            deleteRuler(annotations.selectedObjectId);
            break;
          case 'calibration':
            deleteCalibrationLine();
            break;
          case 'density':
            deleteDensityPoint(annotations.selectedObjectId);
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [annotations.selectedObjectId, annotations.selectedObjectType, deleteBoundingBox, deleteRuler, deleteCalibrationLine, deleteDensityPoint]);

  // Обновление canvas при изменениях
  useEffect(() => {
    draw();
  }, [draw]);

  // Автоматическая подгонка изображения при загрузке
  useEffect(() => {
    if (imageState.src && containerRef.current) {
      const container = containerRef.current;
      setTimeout(() => {
        fitToCanvas(container.clientWidth, container.clientHeight);
      }, 100);
    }
  }, [imageState.src, fitToCanvas]);

  // Подгонка canvas к размеру контейнера
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeCanvas = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      draw();
    };

    resizeCanvas();
    
    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(container);
    
    return () => resizeObserver.disconnect();
  }, [draw]);

  // Курсор
  const getCursor = () => {
    if (isPanning) return 'grabbing';
    if (isDragging && !isResizing) return 'grabbing';
    if (activeTool === 'bbox' && activeClassId >= 0) return 'crosshair';
    if (activeTool === 'ruler' || activeTool === 'calibration') return 'crosshair';
    if (activeTool === 'density') return 'crosshair';
    return 'default';
  };

  return (
    <div 
      ref={containerRef} 
      className="flex-1 bg-gray-100 relative overflow-hidden"
      onContextMenu={(e) => e.preventDefault()}
    >
      {!imageState.src ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <p className="text-lg font-medium mb-2">Загрузите изображение для начала разметки</p>
            <p className="text-sm">Поддерживаются форматы: JPG, PNG, TIFF, BMP (до 20 МБ)</p>
          </div>
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
          style={{ cursor: getCursor() }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onContextMenu={handleContextMenu}
          onWheel={handleWheel}
        />
      )}

      {/* Модальное окно калибровки */}
      {showCalibrationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Калибровка масштаба</h2>
            </div>
            
            <div className="px-6 py-4">
              <p className="mb-4">Длина эталона изменилась.<br/>Укажите реальный размер для пересчёта масштаба.</p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Реальный размер эталона (мм):
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={calibrationLength}
                  onChange={(e) => setCalibrationLength(e.target.value)}
                  autoFocus
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded transition-colors"
                  onClick={handleCalibrationCancel}
                >
                  Отмена
                </button>
                <button
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:bg-gray-300"
                  onClick={handleCalibrationSubmit}
                  disabled={!calibrationLength || parseFloat(calibrationLength) <= 0}
                >
                  Применить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};