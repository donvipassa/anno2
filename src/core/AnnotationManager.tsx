import React, { createContext, useContext, useState, useCallback } from 'react';
import { AnnotationState, BoundingBox, Ruler, CalibrationLine, DensityPoint, DEFECT_CLASSES } from '../types';
import { v4 as uuidv4 } from 'uuid';
import jsonData from '../utils/JSON_data.json';

interface AnnotationContextType {
  annotations: AnnotationState;
  markupModified: boolean;
  setMarkupModifiedState: (modified: boolean) => void;
  addBoundingBox: (bbox: Omit<BoundingBox, 'id'>) => string;
  updateBoundingBox: (id: string, updates: Partial<BoundingBox>) => void;
  deleteBoundingBox: (id: string) => void;
  addRuler: (ruler: Omit<Ruler, 'id'>) => string;
  updateRuler: (id: string, updates: Partial<Ruler>) => void;
  deleteRuler: (id: string) => void;
  setCalibrationLine: (line: Omit<CalibrationLine, 'id'> | null) => void;
  updateCalibrationLine: (updates: Partial<CalibrationLine>) => void;
  deleteCalibrationLine: () => void;
  addDensityPoint: (point: Omit<DensityPoint, 'id'>) => string;
  updateDensityPoint: (id: string, updates: Partial<DensityPoint>) => void;
  deleteDensityPoint: (id: string) => void;
  selectObject: (id: string | null, type: AnnotationState['selectedObjectType']) => void;
  clearAll: () => void;
  clearAllRulers: () => void;
  clearAllDensityPoints: () => void;
  loadAnnotations: (data: any) => void;
  getYOLOExport: (imageWidth: number, imageHeight: number) => string;
  recalculateAllDensityPoints: (imageElement: HTMLImageElement, inverted: boolean) => void;
}

const AnnotationContext = createContext<AnnotationContextType | null>(null);

export const useAnnotations = () => {
  const context = useContext(AnnotationContext);
  if (!context) {
    throw new Error('useAnnotations must be used within AnnotationProvider');
  }
  return context;
};

export const AnnotationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [annotations, setAnnotations] = useState<AnnotationState>({
    boundingBoxes: [],
    rulers: [],
    calibrationLine: null,
    densityPoints: [],
    selectedObjectId: null,
    selectedObjectType: null
  });
  const [markupModified, setMarkupModified] = useState<boolean>(false);

  const setMarkupModifiedState = useCallback((modified: boolean) => {
    setMarkupModified(modified);
  }, []);

  const addBoundingBox = useCallback((bbox: Omit<BoundingBox, 'id'>): string => {
    const id = uuidv4();
    setAnnotations(prev => ({
      ...prev,
      boundingBoxes: [...prev.boundingBoxes, { ...bbox, id }]
    }));
    setMarkupModified(true);
    return id;
  }, []);

  const updateBoundingBox = useCallback((id: string, updates: Partial<BoundingBox>) => {
    setAnnotations(prev => ({
      ...prev,
      boundingBoxes: prev.boundingBoxes.map(box =>
        box.id === id ? { 
          ...box, 
          ...updates,
          // Если изменяется classId на стандартный класс (0-10), очищаем API данные
          ...(updates.classId !== undefined && updates.classId <= 10 ? {
            apiClassName: undefined,
            apiColor: undefined,
            apiId: undefined,
            confidence: undefined
          } : {})
        } : box
      )
    })); 
    setMarkupModified(true);
  }, []);

  const deleteBoundingBox = useCallback((id: string) => {
    setAnnotations(prev => ({
      ...prev,
      boundingBoxes: prev.boundingBoxes.filter(box => box.id !== id),
      selectedObjectId: prev.selectedObjectId === id ? null : prev.selectedObjectId,
      selectedObjectType: prev.selectedObjectId === id ? null : prev.selectedObjectType
    })); 
    setMarkupModified(true);
  }, []);

  const addRuler = useCallback((ruler: Omit<Ruler, 'id'>): string => {
    const id = uuidv4();
    setAnnotations(prev => ({
      ...prev,
      rulers: [...prev.rulers, { ...ruler, id }]
    }));
    setMarkupModified(true);
    return id;
  }, []);

  const updateRuler = useCallback((id: string, updates: Partial<Ruler>) => {
    setAnnotations(prev => ({
      ...prev,
      rulers: prev.rulers.map(ruler =>
        ruler.id === id ? { ...ruler, ...updates } : ruler
      )
    })); 
    setMarkupModified(true);
  }, []);

  const deleteRuler = useCallback((id: string) => {
    setAnnotations(prev => ({
      ...prev,
      rulers: prev.rulers.filter(ruler => ruler.id !== id),
      selectedObjectId: prev.selectedObjectId === id ? null : prev.selectedObjectId,
      selectedObjectType: prev.selectedObjectId === id ? null : prev.selectedObjectType
    })); 
    setMarkupModified(true);
  }, []);

  const setCalibrationLine = useCallback((line: Omit<CalibrationLine, 'id'> | null) => {
    if (line) {
      const id = uuidv4();
      setAnnotations(prev => ({
        ...prev,
        calibrationLine: { ...line, id }
      }));
    } else {
      setAnnotations(prev => ({
        ...prev,
        calibrationLine: null
      }));
    }
    setMarkupModified(true);
  }, []);

  const updateCalibrationLine = useCallback((updates: Partial<CalibrationLine>) => {
    setAnnotations(prev => ({
      ...prev,
      calibrationLine: prev.calibrationLine 
        ? { ...prev.calibrationLine, ...updates }
        : null
    })); 
    setMarkupModified(true);
  }, []);

  const deleteCalibrationLine = useCallback(() => {
    setAnnotations(prev => ({
      ...prev,
      calibrationLine: null,
      selectedObjectId: prev.calibrationLine?.id === prev.selectedObjectId ? null : prev.selectedObjectId,
      selectedObjectType: prev.calibrationLine?.id === prev.selectedObjectId ? null : prev.selectedObjectType
    })); 
    setMarkupModified(true);
  }, []);

  const addDensityPoint = useCallback((point: Omit<DensityPoint, 'id'>): string => {
    const id = uuidv4();
    setAnnotations(prev => ({
      ...prev,
      densityPoints: [...prev.densityPoints, { ...point, id }]
    }));
    setMarkupModified(true);
    return id;
  }, []);

  const updateDensityPoint = useCallback((id: string, updates: Partial<DensityPoint>) => {
    setAnnotations(prev => ({
      ...prev,
      densityPoints: prev.densityPoints.map(point =>
        point.id === id ? { ...point, ...updates } : point
      )
    })); 
    setMarkupModified(true);
  }, []);

  const deleteDensityPoint = useCallback((id: string) => {
    setAnnotations(prev => ({
      ...prev,
      densityPoints: prev.densityPoints.filter(point => point.id !== id),
      selectedObjectId: prev.selectedObjectId === id ? null : prev.selectedObjectId,
      selectedObjectType: prev.selectedObjectId === id ? null : prev.selectedObjectType
    })); 
    setMarkupModified(true);
  }, []);

  const selectObject = useCallback((id: string | null, type: AnnotationState['selectedObjectType']) => {
    setAnnotations(prev => ({
      ...prev,
      selectedObjectId: id,
      selectedObjectType: type
    }));
  }, []);

  const clearAll = useCallback(() => {
    setAnnotations({
      boundingBoxes: [],
      rulers: [],
      calibrationLine: null,
      densityPoints: [],
      selectedObjectId: null,
      selectedObjectType: null
    }); 
    setMarkupModified(false);
  }, []);

  const clearAllRulers = useCallback(() => {
    setAnnotations(prev => ({
      ...prev,
      rulers: [],
      selectedObjectId: prev.selectedObjectType === 'ruler' ? null : prev.selectedObjectId,
      selectedObjectType: prev.selectedObjectType === 'ruler' ? null : prev.selectedObjectType
    })); 
    setMarkupModified(true);
  }, []);

  const clearAllDensityPoints = useCallback(() => {
    setAnnotations(prev => ({
      ...prev,
      densityPoints: [],
      selectedObjectId: prev.selectedObjectType === 'density' ? null : prev.selectedObjectId,
      selectedObjectType: prev.selectedObjectType === 'density' ? null : prev.selectedObjectType
    })); 
    setMarkupModified(true);
  }, []);

  const loadAnnotations = useCallback((data: any) => {
    // Загрузка уже обработанных данных
    if (data && data.boundingBoxes) {
      const boundingBoxes = data.boundingBoxes.map((bbox: any) => ({
        ...bbox,
        id: bbox.id || uuidv4()
      }));
      
      setAnnotations(prev => ({
        ...prev,
        boundingBoxes,
        selectedObjectId: null,
        selectedObjectType: null
      })); 
      setMarkupModified(false);
    }
  }, []);

  const getYOLOExport = useCallback((imageWidth: number, imageHeight: number): string => {
    console.log('=== YOLO Export Debug ===');
    console.log('All bounding boxes:', annotations.boundingBoxes.map(bbox => ({
      id: bbox.id,
      classId: bbox.classId,
      apiId: bbox.apiId,
      apiClassName: bbox.apiClassName,
      confidence: bbox.confidence
    })));
    
    return annotations.boundingBoxes.map(bbox => {
      // Нормализованные координаты YOLO
      const centerX = (bbox.x + bbox.width / 2) / imageWidth;
      const centerY = (bbox.y + bbox.height / 2) / imageHeight;
      const width = bbox.width / imageWidth;
      const height = bbox.height / imageHeight;
      
      console.log('Processing bbox:', {
        id: bbox.id,
        classId: bbox.classId,
        apiId: bbox.apiId,
        apiClassName: bbox.apiClassName,
        isFromAPI: bbox.apiClassName !== undefined && bbox.classId >= 12
      });
      
      // Используем classId как ID для экспорта
      const exportId = bbox.classId;
      
      // Определяем название класса для комментария
      let className = '';
      if (bbox.apiClassName && bbox.classId >= 12) {
        // Если это объект от API, ищем русское название в JSON
        const jsonEntry = jsonData.find((entry: any) => entry.apiID === bbox.classId);
        className = jsonEntry ? jsonEntry.russian_name : bbox.apiClassName;
      } else {
        // Если это пользовательский объект, используем название из DEFECT_CLASSES
        const defectClass = DEFECT_CLASSES.find(c => c.id === bbox.classId);
        className = defectClass ? defectClass.name : 'Неизвестно';
      }
      
      const safeClassName = className.replace(/[^\u0000-\u007F\u0400-\u04FF\s]/g, '?');
      console.log('Export data:', { exportId, className });
      return `${exportId} ${centerX.toFixed(6)} ${centerY.toFixed(6)} ${width.toFixed(6)} ${height.toFixed(6)}   # ${safeClassName}`;
    }).join('\n');
  }, [annotations.boundingBoxes]);

  const recalculateAllDensityPoints = useCallback((imageElement: HTMLImageElement, inverted: boolean) => {
    if (annotations.densityPoints.length === 0 || !imageElement) return;

    // Создаем временный canvas для получения пиксельных данных
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCanvas.width = imageElement.naturalWidth;
    tempCanvas.height = imageElement.naturalHeight;
    
    // Рисуем оригинальное изображение без инверсии
    tempCtx.drawImage(imageElement, 0, 0);
    
    // Пересчитываем плотность для каждой точки
    annotations.densityPoints.forEach(point => {
      try {
        // Получаем пиксельные данные в точке
        const imageData = tempCtx.getImageData(Math.floor(point.x), Math.floor(point.y), 1, 1);
        const r = imageData.data[0];
        const g = imageData.data[1];
        const b = imageData.data[2];
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        
        // Рассчитываем плотность с учетом инверсии
        let density;
        if (inverted) {
          // При инверсии: темные области становятся светлыми, поэтому инвертируем расчет
          density = gray / 255;
        } else {
          // Обычный расчет: 0 = белый, 1 = черный
          density = 1 - (gray / 255);
        }
        
        // Обновляем точку с новым значением плотности
        updateDensityPoint(point.id, { density });
      } catch (error) {
        console.warn('Ошибка при пересчете плотности для точки:', point.id, error);
      }
    });
  }, [annotations.densityPoints, updateDensityPoint]);

  return (
    <AnnotationContext.Provider
      value={{
        annotations,
        markupModified,
        setMarkupModifiedState,
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
        selectObject,
        clearAll,
        clearAllRulers,
        clearAllDensityPoints,
        loadAnnotations,
        getYOLOExport,
        recalculateAllDensityPoints
      }}
    >
      {children}
    </AnnotationContext.Provider>
  );
};