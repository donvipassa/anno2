import React, { useRef, useEffect, useCallback } from 'react';
import { useImage } from '../core/ImageProvider';
import { useAnnotations } from '../core/AnnotationManager';
import { BoundingBox } from '../types';
import { useCanvasInteraction } from '../hooks/useCanvasInteraction';
import { useCanvasRendering } from '../hooks/useCanvasRendering';

interface CanvasAreaProps {
  canvasRef?: React.RefObject<HTMLCanvasElement>;
  activeTool: string;
  activeClassId: number;
  layerVisible: boolean;
  filterActive: boolean;
  onToolChange: (tool: string) => void;
  onSelectClass: (classId: number, imageLoaded: boolean) => void;
  onShowContextMenu: (x: number, y: number) => void;
  onCalibrationLineFinished: (lineData: any, isNew: boolean) => void;
  onBboxCreated: (bboxData: Omit<BoundingBox, 'id' | 'defectRecord' | 'formattedDefectString'>) => void;
  onEditDefectBbox: (bboxId: string) => void;
}

export const CanvasArea: React.FC<CanvasAreaProps> = ({
  canvasRef: externalCanvasRef,
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
  const internalCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = externalCanvasRef || internalCanvasRef;
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { imageState, fitToCanvas } = useImage();
  const { annotations, selectObject, deleteBoundingBox, deleteRuler, deleteCalibrationLine, deleteDensityPoint } = useAnnotations();

  // Используем хуки для взаимодействия и отрисовки
  const {
    isDrawing,
    currentBox,
    currentLine,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    getCursor,
    handleContextMenu
  } = useCanvasInteraction(
    activeTool,
    activeClassId,
    onCalibrationLineFinished,
    onBboxCreated,
    onShowContextMenu
  );

  const { draw } = useCanvasRendering(
    layerVisible,
    filterActive,
    activeClassId,
    activeTool,
    isDrawing,
    currentBox,
    currentLine
  );

  // Обработчик двойного клика
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (!imageState.imageElement) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    const imageX = (canvasX - imageState.offsetX) / imageState.scale;
    const imageY = (canvasY - imageState.offsetY) / imageState.scale;
    
    // Простая проверка попадания в bbox
    const clickedBbox = annotations.boundingBoxes.find(bbox => 
      imageX >= bbox.x && imageX <= bbox.x + bbox.width &&
      imageY >= bbox.y && imageY <= bbox.y + bbox.height
    );
    
    if (clickedBbox) {
      if ((clickedBbox.classId >= 0 && clickedBbox.classId <= 9) || clickedBbox.defectRecord) {
        onEditDefectBbox(clickedBbox.id);
      }
    }
  }, [imageState, annotations.boundingBoxes, onEditDefectBbox]);

  // Обработчик клавиш
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
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
      selectObject(null, null);
    }
  }, [annotations.selectedObjectId, annotations.selectedObjectType, deleteBoundingBox, deleteRuler, deleteCalibrationLine, deleteDensityPoint, selectObject]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);


  // Обновление canvas при изменениях
  useEffect(() => {
    draw(canvasRef);
  }, [draw, canvasRef]);

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
          onMouseDown={(e) => handleMouseDown(e, canvasRef)}
          onMouseMove={(e) => handleMouseMove(e, canvasRef)}
          onMouseUp={(e) => handleMouseUp(e, canvasRef)}
          onMouseLeave={handleMouseUp}
          onContextMenu={handleContextMenu}
          onDoubleClick={handleDoubleClick}
          onWheel={(e) => handleWheel(e, canvasRef)}
        />
      )}
    </div>
  );
};