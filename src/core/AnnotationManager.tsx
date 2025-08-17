import React, { createContext, useContext, useState, useCallback } from 'react';
import { AnnotationState, BoundingBox, Ruler, CalibrationLine, DensityPoint, DEFECT_CLASSES } from '../types';
import { v4 as uuidv4 } from 'uuid';

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
        box.id === id ? { ...box, ...updates } : box
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
    return annotations.boundingBoxes.map(bbox => {
      // Нормализованные координаты YOLO
      const centerX = (bbox.x + bbox.width / 2) / imageWidth;
      const centerY = (bbox.y + bbox.height / 2) / imageHeight;
      const width = bbox.width / imageWidth;
      const height = bbox.height / imageHeight;
      
      // Используем оригинальное название от API, если оно есть, иначе название класса
      let className: string;
      if (bbox.apiClassName) {
        className = bbox.apiClassName;
      } else {
        className = DEFECT_CLASSES.find(c => c.id === bbox.classId)?.name || 'Неизвестно';
      }
      
      // Проверяем, что название класса содержит только корректные символы
      const safeClassName = className.replace(/[^\u0000-\u007F\u0400-\u04FF\s]/g, '?');
      
      return `${bbox.classId} ${centerX.toFixed(6)} ${centerY.toFixed(6)} ${width.toFixed(6)} ${height.toFixed(6)}   # ${safeClassName}`;
    }).join('\n');
  }, [annotations.boundingBoxes]);

  return (
    <AnnotationContext.Provider
      value={{
        markupModified,
        setMarkupModifiedState,
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
        selectObject,
        clearAll,
        clearAllRulers,
        clearAllDensityPoints,
        loadAnnotations,
        getYOLOExport
      }}
    >
      {children}
    </AnnotationContext.Provider>
  );
};