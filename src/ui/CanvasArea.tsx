import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useImage } from '../core/ImageProvider';
import { useAnnotations } from '../core/AnnotationManager';
import { calculateDistance, pointInRect } from '../utils/geometry';
import { calculateDensity } from '../utils/imageUtils';
import { drawBoundingBox, drawResizeHandles, getResizeHandle, isPointInBox } from '../utils/canvas';
import { DEFECT_CLASSES, BoundingBox } from '../types';
import jsonData from '../data/defect-classes.json';

interface CanvasAreaProps {
  activeTool: string;
  activeClassId: number;
  layerVisible: boolean;
  filterActive: boolean;
  onToolChange: (tool: string) => void;
  onSelectClass: (classId: number) => void;
  onShowContextMenu: (x: number, y: number) => void;
  onCalibrationLineFinished: (lineData: any, isNew: boolean) => void;
  onBboxCreated: (bboxData: Omit<BoundingBox, 'id' | 'defectRecord' | 'formattedDefectString'>) => void;
  onEditDefectBbox: (bboxId: string) => void;
}

export const CanvasArea: React.FC<CanvasAreaProps> = ({
  activeTool,
  activeClassId,
  layerVisible,
  filterActive,
  onToolChange,
  onSelectClass,
  onShowContextMenu,
  onCalibrationLineFinished,
  onBboxCreated,
  onEditDefectBbox
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { imageState, setOffset, zoomToPoint, getOriginalPixelColor } = useImage();
  const { 
    annotations, 
    selectObject, 
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
    deleteDensityPoint 
  } = useAnnotations();

  // Состояние для рисования
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentPoint, setCurrentPoint] = useState<{ x: number; y: number } | null>(null);
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    dragType: 'move' | 'resize' | 'pan' | null;
    resizeHandle: string | null;
    startX: number;
    startY: number;
    initialBbox?: any;
    initialRuler?: any;
    initialCalibration?: any;
    initialDensity?: any;
  }>({
    isDragging: false,
    dragType: null,
    resizeHandle: null,
    startX: 0,
    startY: 0
  });

  // Преобразование координат экрана в координаты изображения
  const screenToImage = useCallback((screenX: number, screenY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const canvasX = screenX - rect.left;
    const canvasY = screenY - rect.top;

    const imageX = (canvasX - imageState.offsetX) / imageState.scale;
    const imageY = (canvasY - imageState.offsetY) / imageState.scale;

    return { x: imageX, y: imageY };
  }, [imageState.offsetX, imageState.offsetY, imageState.scale]);

  // Отрисовка canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageState.imageElement) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Очистка canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Настройка трансформации
    ctx.save();
    ctx.translate(imageState.offsetX, imageState.offsetY);
    ctx.scale(imageState.scale, imageState.scale);

    // Отрисовка изображения
    if (imageState.inverted) {
      ctx.filter = 'invert(1)';
    }
    ctx.drawImage(imageState.imageElement, 0, 0, imageState.width, imageState.height);
    ctx.filter = 'none';

    // Отрисовка аннотаций (если слой видим)
    if (layerVisible) {
      // Фильтрация объектов
      let visibleBboxes = annotations.boundingBoxes;
      if (filterActive && activeClassId >= 0) {
        visibleBboxes = annotations.boundingBoxes.filter(bbox => bbox.classId === activeClassId);
      }

      // Отрисовка bounding boxes
      visibleBboxes.forEach(bbox => {
        const isSelected = annotations.selectedObjectId === bbox.id && annotations.selectedObjectType === 'bbox';
        drawBoundingBox(ctx, bbox, isSelected, imageState.scale, DEFECT_CLASSES, jsonData, annotations.calibrationLine);
      });

      // Отрисовка линеек
      annotations.rulers.forEach(ruler => {
        const isSelected = annotations.selectedObjectId === ruler.id && annotations.selectedObjectType === 'ruler';
        
        ctx.strokeStyle = isSelected ? '#FF0000' : '#FFFF00';
        ctx.lineWidth = (isSelected ? 4 : 3) / imageState.scale;
        ctx.setLineDash([]);
        
        ctx.beginPath();
        ctx.moveTo(ruler.x1, ruler.y1);
        ctx.lineTo(ruler.x2, ruler.y2);
        ctx.stroke();

        // Маркеры на концах
        ctx.fillStyle = isSelected ? '#FF0000' : '#FFFF00';
        ctx.beginPath();
        ctx.arc(ruler.x1, ruler.y1, 4 / imageState.scale, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ruler.x2, ruler.y2, 4 / imageState.scale, 0, 2 * Math.PI);
        ctx.fill();

        // Подпись с длиной
        const length = calculateDistance(ruler.x1, ruler.y1, ruler.x2, ruler.y2);
        let lengthText = '';
        if (annotations.calibrationLine) {
          const pixelLength = Math.sqrt(
            (annotations.calibrationLine.x2 - annotations.calibrationLine.x1) ** 2 + 
            (annotations.calibrationLine.y2 - annotations.calibrationLine.y1) ** 2
          );
          const scale = annotations.calibrationLine.realLength / pixelLength;
          const realLength = length * scale;
          lengthText = `${realLength.toFixed(1)} мм`;
        } else {
          lengthText = `${length.toFixed(0)} px`;
        }

        ctx.fillStyle = isSelected ? '#FF0000' : '#FFFF00';
        ctx.font = `${Math.max(16 / imageState.scale, 12)}px Arial`;
        const midX = (ruler.x1 + ruler.x2) / 2;
        const midY = (ruler.y1 + ruler.y2) / 2;
        ctx.fillText(lengthText, midX, midY - 10 / imageState.scale);
      });

      // Отрисовка калибровочной линии
      if (annotations.calibrationLine) {
        const line = annotations.calibrationLine;
        const isSelected = annotations.selectedObjectId === line.id && annotations.selectedObjectType === 'calibration';
        
        ctx.strokeStyle = isSelected ? '#FF0000' : '#0000FF';
        ctx.lineWidth = (isSelected ? 6 : 4) / imageState.scale;
        ctx.setLineDash([]);
        
        ctx.beginPath();
        ctx.moveTo(line.x1, line.y1);
        ctx.lineTo(line.x2, line.y2);
        ctx.stroke();

        // Маркеры на концах
        ctx.fillStyle = isSelected ? '#FF0000' : '#0000FF';
        ctx.beginPath();
        ctx.arc(line.x1, line.y1, 5 / imageState.scale, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(line.x2, line.y2, 5 / imageState.scale, 0, 2 * Math.PI);
        ctx.fill();

        // Подпись с размером
        ctx.fillStyle = isSelected ? '#FF0000' : '#0000FF';
        ctx.font = `${Math.max(16 / imageState.scale, 12)}px Arial`;
        const midX = (line.x1 + line.x2) / 2;
        const midY = (line.y1 + line.y2) / 2;
        ctx.fillText(`${line.realLength} мм`, midX, midY - 10 / imageState.scale);
      }

      // Отрисовка точек измерения плотности
      annotations.densityPoints.forEach(point => {
        const isSelected = annotations.selectedObjectId === point.id && annotations.selectedObjectType === 'density';
        
        ctx.strokeStyle = isSelected ? '#FF0000' : '#FF00FF';
        ctx.lineWidth = (isSelected ? 4 : 3) / imageState.scale;

        // Крест
        const size = 15 / imageState.scale;
        ctx.beginPath();
        ctx.moveTo(point.x - size, point.y);
        ctx.lineTo(point.x + size, point.y);
        ctx.moveTo(point.x, point.y - size);
        ctx.lineTo(point.x, point.y + size);
        ctx.stroke();

        // Вычисление и отображение плотности
        const originalColor = getOriginalPixelColor(point.x, point.y);
        if (originalColor) {
          const [r, g, b] = originalColor;
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          const density = 1 - (gray / 255);

          ctx.fillStyle = isSelected ? '#FF0000' : '#FF00FF';
          ctx.font = `${Math.max(16 / imageState.scale, 12)}px Arial`;
          ctx.fillText(`${density.toFixed(2)}`, point.x + 20 / imageState.scale, point.y - 5 / imageState.scale);
        }
      });
    }

    // Отрисовка текущего рисования
    if (isDrawing && startPoint && currentPoint) {
      ctx.strokeStyle = '#FF0000';
      ctx.lineWidth = 2 / imageState.scale;
      ctx.setLineDash([5 / imageState.scale, 5 / imageState.scale]);

      if (activeTool === 'bbox') {
        const width = currentPoint.x - startPoint.x;
        const height = currentPoint.y - startPoint.y;
        ctx.strokeRect(startPoint.x, startPoint.y, width, height);
      } else if (activeTool === 'ruler' || activeTool === 'calibration') {
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(currentPoint.x, currentPoint.y);
        ctx.stroke();
      }
    }

    ctx.restore();
  }, [
    imageState, 
    annotations, 
    layerVisible, 
    filterActive, 
    activeClassId, 
    activeTool,
    isDrawing, 
    startPoint, 
    currentPoint,
    getOriginalPixelColor
  ]);

  // Обработчики мыши
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!imageState.imageElement) return;

    const { x: imageX, y: imageY } = screenToImage(e.clientX, e.clientY);
    
    // Правая кнопка мыши - панорамирование
    if (e.button === 2) {
      setDragState({
        isDragging: true,
        dragType: 'pan',
        resizeHandle: null,
        startX: e.clientX,
        startY: e.clientY
      });
      return;
    }

    // Левая кнопка мыши
    if (e.button === 0) {
      // Проверка попадания в существующие объекты
      let hitObject = null;
      let hitType = null;
      let resizeHandle = null;

      // Проверка bounding boxes
      for (const bbox of annotations.boundingBoxes) {
        const handle = getResizeHandle(imageX, imageY, bbox, imageState.scale);
        if (handle) {
          hitObject = bbox;
          hitType = 'bbox';
          resizeHandle = handle;
          break;
        }
      }

      // Проверка линеек
      if (!hitObject) {
        for (const ruler of annotations.rulers) {
          const tolerance = 15 / imageState.scale;
          const distToLine = Math.abs(
            (ruler.y2 - ruler.y1) * imageX - (ruler.x2 - ruler.x1) * imageY + 
            ruler.x2 * ruler.y1 - ruler.y2 * ruler.x1
          ) / Math.sqrt((ruler.y2 - ruler.y1) ** 2 + (ruler.x2 - ruler.x1) ** 2);
          
          if (distToLine <= tolerance) {
            const minX = Math.min(ruler.x1, ruler.x2) - tolerance;
            const maxX = Math.max(ruler.x1, ruler.x2) + tolerance;
            const minY = Math.min(ruler.y1, ruler.y2) - tolerance;
            const maxY = Math.max(ruler.y1, ruler.y2) + tolerance;
            
            if (imageX >= minX && imageX <= maxX && imageY >= minY && imageY <= maxY) {
              hitObject = ruler;
              hitType = 'ruler';
              break;
            }
          }
        }
      }

      // Проверка калибровочной линии
      if (!hitObject && annotations.calibrationLine) {
        const line = annotations.calibrationLine;
        const tolerance = 15 / imageState.scale;
        const distToLine = Math.abs(
          (line.y2 - line.y1) * imageX - (line.x2 - line.x1) * imageY + 
          line.x2 * line.y1 - line.y2 * line.x1
        ) / Math.sqrt((line.y2 - line.y1) ** 2 + (line.x2 - line.x1) ** 2);
        
        if (distToLine <= tolerance) {
          const minX = Math.min(line.x1, line.x2) - tolerance;
          const maxX = Math.max(line.x1, line.x2) + tolerance;
          const minY = Math.min(line.y1, line.y2) - tolerance;
          const maxY = Math.max(line.y1, line.y2) + tolerance;
          
          if (imageX >= minX && imageX <= maxX && imageY >= minY && imageY <= maxY) {
            hitObject = line;
            hitType = 'calibration';
          }
        }
      }

      // Проверка точек плотности
      if (!hitObject) {
        for (const point of annotations.densityPoints) {
          const distance = calculateDistance(imageX, imageY, point.x, point.y);
          if (distance <= 25 / imageState.scale) {
            hitObject = point;
            hitType = 'density';
            break;
          }
        }
      }

      // Если попали в объект
      if (hitObject) {
        selectObject(hitObject.id, hitType as any);
        
        if (resizeHandle && resizeHandle !== 'move') {
          // Начинаем изменение размера
          setDragState({
            isDragging: true,
            dragType: 'resize',
            resizeHandle,
            startX: imageX,
            startY: imageY,
            initialBbox: hitType === 'bbox' ? { ...hitObject } : undefined
          });
        } else {
          // Начинаем перемещение
          setDragState({
            isDragging: true,
            dragType: 'move',
            resizeHandle: null,
            startX: imageX,
            startY: imageY,
            initialBbox: hitType === 'bbox' ? { ...hitObject } : undefined,
            initialRuler: hitType === 'ruler' ? { ...hitObject } : undefined,
            initialCalibration: hitType === 'calibration' ? { ...hitObject } : undefined,
            initialDensity: hitType === 'density' ? { ...hitObject } : undefined
          });
        }
        return;
      }

      // Если не попали в объект, начинаем рисование нового
      if (activeTool === 'bbox' && activeClassId >= 0) {
        selectObject(null, null);
        setIsDrawing(true);
        setStartPoint({ x: imageX, y: imageY });
        setCurrentPoint({ x: imageX, y: imageY });
      } else if (activeTool === 'ruler') {
        selectObject(null, null);
        setIsDrawing(true);
        setStartPoint({ x: imageX, y: imageY });
        setCurrentPoint({ x: imageX, y: imageY });
      } else if (activeTool === 'calibration') {
        selectObject(null, null);
        setIsDrawing(true);
        setStartPoint({ x: imageX, y: imageY });
        setCurrentPoint({ x: imageX, y: imageY });
      } else if (activeTool === 'density') {
        const pointId = addDensityPoint({ x: imageX, y: imageY });
        selectObject(pointId, 'density');
      } else {
        // Сброс выделения при клике в пустое место
        selectObject(null, null);
      }
    }
  }, [
    imageState, 
    screenToImage, 
    annotations, 
    activeTool, 
    activeClassId, 
    selectObject, 
    addDensityPoint
  ]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!imageState.imageElement) return;

    const { x: imageX, y: imageY } = screenToImage(e.clientX, e.clientY);

    // Обработка перетаскивания
    if (dragState.isDragging) {
      if (dragState.dragType === 'pan') {
        const deltaX = e.clientX - dragState.startX;
        const deltaY = e.clientY - dragState.startY;
        setOffset(imageState.offsetX + deltaX, imageState.offsetY + deltaY);
        setDragState(prev => ({ ...prev, startX: e.clientX, startY: e.clientY }));
      } else if (dragState.dragType === 'move') {
        const deltaX = imageX - dragState.startX;
        const deltaY = imageY - dragState.startY;

        if (dragState.initialBbox && annotations.selectedObjectType === 'bbox') {
          updateBoundingBox(annotations.selectedObjectId!, {
            x: Math.max(0, Math.min(dragState.initialBbox.x + deltaX, imageState.width - dragState.initialBbox.width)),
            y: Math.max(0, Math.min(dragState.initialBbox.y + deltaY, imageState.height - dragState.initialBbox.height))
          });
        } else if (dragState.initialRuler && annotations.selectedObjectType === 'ruler') {
          updateRuler(annotations.selectedObjectId!, {
            x1: dragState.initialRuler.x1 + deltaX,
            y1: dragState.initialRuler.y1 + deltaY,
            x2: dragState.initialRuler.x2 + deltaX,
            y2: dragState.initialRuler.y2 + deltaY
          });
        } else if (dragState.initialCalibration && annotations.selectedObjectType === 'calibration') {
          updateCalibrationLine({
            x1: dragState.initialCalibration.x1 + deltaX,
            y1: dragState.initialCalibration.y1 + deltaY,
            x2: dragState.initialCalibration.x2 + deltaX,
            y2: dragState.initialCalibration.y2 + deltaY
          });
        } else if (dragState.initialDensity && annotations.selectedObjectType === 'density') {
          updateDensityPoint(annotations.selectedObjectId!, {
            x: Math.max(0, Math.min(dragState.initialDensity.x + deltaX, imageState.width)),
            y: Math.max(0, Math.min(dragState.initialDensity.y + deltaY, imageState.height))
          });
        }
      } else if (dragState.dragType === 'resize' && dragState.initialBbox) {
        const deltaX = imageX - dragState.startX;
        const deltaY = imageY - dragState.startY;
        const bbox = dragState.initialBbox;
        let newBbox = { ...bbox };

        switch (dragState.resizeHandle) {
          case 'nw':
            newBbox.x = Math.max(0, bbox.x + deltaX);
            newBbox.y = Math.max(0, bbox.y + deltaY);
            newBbox.width = Math.max(10, bbox.width - deltaX);
            newBbox.height = Math.max(10, bbox.height - deltaY);
            break;
          case 'n':
            newBbox.y = Math.max(0, bbox.y + deltaY);
            newBbox.height = Math.max(10, bbox.height - deltaY);
            break;
          case 'ne':
            newBbox.y = Math.max(0, bbox.y + deltaY);
            newBbox.width = Math.max(10, bbox.width + deltaX);
            newBbox.height = Math.max(10, bbox.height - deltaY);
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
            newBbox.x = Math.max(0, bbox.x + deltaX);
            newBbox.width = Math.max(10, bbox.width - deltaX);
            newBbox.height = Math.max(10, bbox.height + deltaY);
            break;
          case 'w':
            newBbox.x = Math.max(0, bbox.x + deltaX);
            newBbox.width = Math.max(10, bbox.width - deltaX);
            break;
        }

        // Ограничиваем размеры границами изображения
        if (newBbox.x + newBbox.width > imageState.width) {
          newBbox.width = imageState.width - newBbox.x;
        }
        if (newBbox.y + newBbox.height > imageState.height) {
          newBbox.height = imageState.height - newBbox.y;
        }

        updateBoundingBox(annotations.selectedObjectId!, newBbox);
      }
    }

    // Обработка рисования
    if (isDrawing && startPoint) {
      setCurrentPoint({ x: imageX, y: imageY });
    }

    // Изменение курсора
    if (!dragState.isDragging) {
      let cursor = 'default';
      
      // Проверка наведения на handles
      for (const bbox of annotations.boundingBoxes) {
        if (annotations.selectedObjectId === bbox.id && annotations.selectedObjectType === 'bbox') {
          const handle = getResizeHandle(imageX, imageY, bbox, imageState.scale);
          if (handle) {
            switch (handle) {
              case 'nw':
              case 'se':
                cursor = 'nw-resize';
                break;
              case 'ne':
              case 'sw':
                cursor = 'ne-resize';
                break;
              case 'n':
              case 's':
                cursor = 'n-resize';
                break;
              case 'e':
              case 'w':
                cursor = 'e-resize';
                break;
              case 'move':
                cursor = 'move';
                break;
            }
            break;
          }
        }
      }

      if (canvasRef.current) {
        canvasRef.current.style.cursor = cursor;
      }
    }
  }, [
    imageState, 
    screenToImage, 
    dragState, 
    setOffset, 
    annotations, 
    updateBoundingBox, 
    updateRuler, 
    updateCalibrationLine, 
    updateDensityPoint,
    isDrawing, 
    startPoint
  ]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (dragState.isDragging) {
      setDragState({
        isDragging: false,
        dragType: null,
        resizeHandle: null,
        startX: 0,
        startY: 0
      });
    }

    if (isDrawing && startPoint && currentPoint) {
      const { x: imageX, y: imageY } = screenToImage(e.clientX, e.clientY);
      
      if (activeTool === 'bbox' && activeClassId >= 0) {
        const width = Math.abs(imageX - startPoint.x);
        const height = Math.abs(imageY - startPoint.y);
        
        if (width > 10 && height > 10) {
          const x = Math.min(startPoint.x, imageX);
          const y = Math.min(startPoint.y, imageY);
          
          onBboxCreated({
            x: Math.max(0, x),
            y: Math.max(0, y),
            width: Math.min(width, imageState.width - x),
            height: Math.min(height, imageState.height - y),
            classId: activeClassId
          });
        }
      } else if (activeTool === 'ruler') {
        const length = calculateDistance(startPoint.x, startPoint.y, imageX, imageY);
        if (length > 5) {
          const rulerId = addRuler({
            x1: startPoint.x,
            y1: startPoint.y,
            x2: imageX,
            y2: imageY
          });
          selectObject(rulerId, 'ruler');
        }
      } else if (activeTool === 'calibration') {
        const length = calculateDistance(startPoint.x, startPoint.y, imageX, imageY);
        if (length > 10) {
          const lineData = {
            x1: startPoint.x,
            y1: startPoint.y,
            x2: imageX,
            y2: imageY,
            realLength: 50 // значение по умолчанию
          };
          
          // Если уже есть калибровочная линия, заменяем её
          if (annotations.calibrationLine) {
            onCalibrationLineFinished(lineData, false);
          } else {
            onCalibrationLineFinished(lineData, true);
          }
        }
      }

      setIsDrawing(false);
      setStartPoint(null);
      setCurrentPoint(null);
    }
  }, [
    dragState, 
    isDrawing, 
    startPoint, 
    currentPoint, 
    screenToImage, 
    activeTool, 
    activeClassId, 
    imageState,
    onBboxCreated,
    addRuler, 
    selectObject, 
    annotations.calibrationLine,
    onCalibrationLineFinished
  ]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    console.log('Double click detected');
    if (!imageState.imageElement) return;

    const { x: imageX, y: imageY } = screenToImage(e.clientX, e.clientY);
    console.log('Double click at image coordinates:', { imageX, imageY });

    // Проверяем попадание в bounding box
    for (const bbox of annotations.boundingBoxes) {
      console.log('Checking bbox:', bbox.id, 'classId:', bbox.classId);
      if (isPointInBox(imageX, imageY, bbox)) {
        console.log('Hit bbox:', bbox.id, 'classId:', bbox.classId);
        // Проверяем, что это дефект (классы 0-9)
        if (bbox.classId >= 0 && bbox.classId <= 9) {
          console.log('Opening defect form for bbox:', bbox.id);
          onEditDefectBbox(bbox.id);
          return;
        } else {
          console.log('Bbox is not a defect class, skipping form');
        }
      }
    }
    console.log('No bbox hit by double click');
  }, [imageState.imageElement, screenToImage, annotations.boundingBoxes, onEditDefectBbox]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!imageState.imageElement) return;
    
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const pointX = e.clientX - rect.left;
    const pointY = e.clientY - rect.top;

    const zoomIn = e.deltaY < 0;
    zoomToPoint(pointX, pointY, zoomIn, canvas.clientWidth, canvas.clientHeight);
  }, [imageState.imageElement, zoomToPoint]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onShowContextMenu(e.clientX, e.clientY);
  }, [onShowContextMenu]);

  // Обработчики клавиатуры для удаления объектов
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && annotations.selectedObjectId) {
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
  }, [
    annotations.selectedObjectId, 
    annotations.selectedObjectType, 
    deleteBoundingBox, 
    deleteRuler, 
    deleteCalibrationLine, 
    deleteDensityPoint
  ]);

  // Обновление размеров canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        draw();
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [draw]);

  // Перерисовка при изменении состояния
  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <div className="flex-1 relative overflow-hidden bg-gray-200">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
      />
      
      {!imageState.src && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <p className="text-lg mb-2">Загрузите изображение для начала работы</p>
            <p className="text-sm">Используйте кнопку "Открыть файл" или нажмите Ctrl+O</p>
          </div>
        </div>
      )}
    </div>
  );
};