import { useState, useCallback } from 'react';

export interface AppUIState {
  activeTool: string;
  activeClassId: number;
  layerVisible: boolean;
  filterActive: boolean;
  autoAnnotationPerformed: boolean;
  isProcessingAutoAnnotation: boolean;
  markupFileName: string | null;
  calibrationInputValue: string;
}

export const useAppState = () => {
  const [activeTool, setActiveTool] = useState<string>('');
  const [activeClassId, setActiveClassId] = useState<number>(-1);
  const [layerVisible, setLayerVisible] = useState<boolean>(true);
  const [filterActive, setFilterActive] = useState<boolean>(false);
  const [autoAnnotationPerformed, setAutoAnnotationPerformed] = useState<boolean>(false);
  const [isProcessingAutoAnnotation, setIsProcessingAutoAnnotation] = useState<boolean>(false);
  const [markupFileName, setMarkupFileName] = useState<string | null>(null);
  const [calibrationInputValue, setCalibrationInputValue] = useState<string>('50');

  const handleToolChange = useCallback((tool: string) => {
    setActiveTool(tool);
  }, []);

  const handleClassSelect = useCallback((classId: number) => {
    setActiveClassId(classId);
    setActiveTool('bbox');
  }, []);

  const resetState = useCallback(() => {
    setActiveTool('');
    setActiveClassId(-1);
    setMarkupFileName(null);
    setAutoAnnotationPerformed(false);
    setIsProcessingAutoAnnotation(false);
  }, []);

  return {
    // State
    activeTool,
    activeClassId,
    layerVisible,
    filterActive,
    autoAnnotationPerformed,
    isProcessingAutoAnnotation,
    markupFileName,
    calibrationInputValue,
    
    // Setters
    setActiveTool,
    setActiveClassId,
    setLayerVisible,
    setFilterActive,
    setAutoAnnotationPerformed,
    setIsProcessingAutoAnnotation,
    setMarkupFileName,
    setCalibrationInputValue,
    
    // Actions
    handleToolChange,
    handleClassSelect,
    resetState
  };
};