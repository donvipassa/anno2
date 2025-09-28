import { useState, useCallback, useEffect } from 'react';
import { useAnnotations } from '../core/AnnotationManager';

/**
 * Хук для управления активными инструментами и классами
 */
export const useToolManagement = () => {
  const { annotations, selectObject } = useAnnotations();
  const [activeTool, setActiveTool] = useState<string>('');
  const [activeClassId, setActiveClassId] = useState<number>(-1);

  // Синхронизация activeClassId с выделенным объектом
  useEffect(() => {
    if (annotations.selectedObjectId) {
      switch (annotations.selectedObjectType) {
        case 'bbox':
          const selectedBbox = annotations.boundingBoxes.find(bbox => bbox.id === annotations.selectedObjectId);
          if (selectedBbox) {
            setActiveTool('bbox');
            if (selectedBbox.classId >= 0 && selectedBbox.classId <= 10) {
              setActiveClassId(selectedBbox.classId);
            } else {
              setActiveClassId(-1);
            }
          }
          break;
        case 'ruler':
          setActiveTool('ruler');
          setActiveClassId(-1);
          break;
        case 'calibration':
          setActiveTool('calibration');
          setActiveClassId(-1);
          break;
        case 'density':
          setActiveTool('density');
          setActiveClassId(-1);
          break;
      }
    }
  }, [annotations.selectedObjectId, annotations.selectedObjectType, annotations.boundingBoxes]);

  const handleClassSelect = useCallback((classId: number, imageLoaded: boolean) => {
    if (!imageLoaded) return;
    
    setActiveClassId(classId);
    setActiveTool('bbox');
  }, []);

  const handleToolChange = useCallback((tool: string) => {
    setActiveTool(tool);
    
    // Сбрасываем выделение и класс при выборе инструментов измерения
    if (tool === 'density' || tool === 'ruler' || tool === 'calibration') {
      selectObject(null, null);
      setActiveClassId(-1);
    }
  }, [selectObject]);

  const resetTools = useCallback(() => {
    setActiveTool('');
    setActiveClassId(-1);
    selectObject(null, null);
  }, [selectObject]);

  return {
    activeTool,
    activeClassId,
    handleClassSelect,
    handleToolChange,
    resetTools,
    setActiveTool,
    setActiveClassId
  };
};