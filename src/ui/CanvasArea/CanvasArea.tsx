import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useImage } from '../../core/ImageProvider';
import { useAnnotations } from '../../core/AnnotationManager';
import { useCalibration } from '../../core/CalibrationManager';
import { DEFECT_CLASSES } from '../../types';
import { MouseEventHandler } from './MouseEventHandler';
import { CanvasRenderer } from './CanvasRenderer';
import { ObjectDetector } from './ObjectDetector';
import { UI_CONFIG } from '../../config';
import jsonData from '../../data/defect-classes.json';

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
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { imageState, setOffset, zoomToPoint, getOriginalPixelColor, fitToCanvas } = useImage();
  const { annotations, selectObject } = useAnnotations();
  
  // Инициализация обработчиков
  const mouseHandler = new MouseEventHandler({
    imageState,
    annotations,
    activeTool,
    activeClassId,
    onBboxCreated,
    onCalibrationLineFinished,
    selectObject,
    setOffset
  });
  
  const renderer = new CanvasRenderer({
    imageState,
    annotations,
    layerVisible,
    filterActive,
    activeClassId,
    getOriginalPixelColor
  });
  
  const objectDetector = new ObjectDetector({
    annotations,
    imageState
  });

  // Состояние для отрисовки
  const [drawingState, setDrawingState] = useState({
    isDrawing: false,
    currentBox: null,
    currentLine: null,
    isDragging: false,
    isPanning: false
  });

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

  // Отрисовка canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageState.imageElement) return;

    renderer.render(canvas, drawingState);
  }, [imageState, annotations, layerVisible, filterActive, activeClassId, drawingState, renderer]);

  // Обработчики событий мыши
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const coords = getImageCoords(e.clientX, e.clientY);
    const result = mouseHandler.handleMouseDown(e, coords);
    
    if (result.stateUpdate) {
      setDrawingState(prev => ({ ...prev, ...result.stateUpdate }));
    }
  }, [mouseHandler, getImageCoords]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const coords = getImageCoords(e.clientX, e.clientY);
    const result = mouseHandler.handleMouseMove(e, coords, drawingState);
    
    if (result.stateUpdate) {
      setDrawingState(prev => ({ ...prev, ...result.stateUpdate }));
    }
  }, [mouseHandler, getImageCoords, drawingState]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const coords = getImageCoords(e.clientX, e.clientY);
    const result = mouseHandler.handleMouseUp(e, coords, drawingState);
    
    if (result.stateUpdate) {
      setDrawingState(prev => ({ ...prev, ...result.stateUpdate }));
    }
  }, [mouseHandler, getImageCoords, drawingState]);

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

  // Обработчик двойного клика
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (!imageState.imageElement) return;
    const coords = getImageCoords(e.clientX, e.clientY);
    const clickedBbox = objectDetector.getBboxAtPoint(coords.x, coords.y);
    
    // Проверяем, что это рамка дефекта (классы 0-9)
    if (clickedBbox && clickedBbox.classId >= 0 && clickedBbox.classId <= 9) {
      onEditDefectBbox(clickedBbox.id);
    }
  }, [imageState.imageElement, getImageCoords, objectDetector, onEditDefectBbox]);

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
    if (drawingState.isPanning) return 'grabbing';
    if (drawingState.isDragging) return 'grabbing';
    
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
          onContextMenu={(e) => {
            e.preventDefault();
            onShowContextMenu(e.clientX, e.clientY);
          }}
          onDoubleClick={handleDoubleClick}
          onWheel={handleWheel}
        />
      )}
    </div>
  );
};