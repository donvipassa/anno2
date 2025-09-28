import React, { useState, useCallback, useEffect } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ImageProvider } from './core/ImageProvider';
import { AnnotationProvider } from './core/AnnotationManager';
import { DefectFormModal } from './components/DefectFormModal';
import { DefectRecord } from './types/defects';
import { 
  Header, 
  Toolbar, 
  Sidebar, 
  CanvasArea, 
  StatusBar, 
  Modal, 
  ModalButtons, 
  ModalButton 
} from './ui';
import { useImage } from './core/ImageProvider';
import { useAnnotations } from './core/AnnotationManager';
import { useCalibration } from './core/CalibrationManager';
import { saveImageAsFile } from './utils';
import { MODAL_TYPES } from './utils/constants';
import { detectObjects } from './services/api';
import { mapApiClassToDefectClassId, convertApiBboxToPixels } from './utils';
import { useModalState } from './hooks/useModalState';
import { useDefectFormModal } from './hooks/useDefectFormModal';
import { useContextMenu } from './hooks/useContextMenu';
import { useFileOperations } from './hooks/useFileOperations';
import { useAppState } from './hooks/useAppState';
import { useCalibrationHandlers } from './hooks/useCalibrationHandlers';
import jsonData from './data/defect-classes.json';

const AppContent: React.FC = () => {
  // Хуки для управления состоянием
  const { 
    annotations,
    loadAnnotations, 
    clearAll, 
    selectObject, 
    addBoundingBox,
    deleteBoundingBox,
    updateBoundingBoxDefectRecord,
    setCalibrationLine,
    updateCalibrationLine,
    markupModified,
    setMarkupModifiedState,
    clearAllRulers,
    clearAllDensityPoints
  } = useAnnotations();
  
  const { 
    imageState, 
    loadImage, 
    setScale, 
    toggleInversion, 
    resetView, 
    fitToCanvas, 
    zoomIn, 
    zoomOut, 
    zoomReset,
    getOriginalPixelColor
  } = useImage();
  
  const { calibration, setScale: setCalibrationScale, resetScale } = useCalibration();

  // Хуки для управления UI состоянием
  const { modalState, closeModal, showModal } = useModalState();
  const { defectFormModalState, openDefectFormModal, closeDefectFormModal } = useDefectFormModal();
  const { contextMenu, showContextMenu, hideContextMenu } = useContextMenu();
  // Используем кастомный хук для управления состоянием приложения
  const {
    activeTool,
    activeClassId,
    layerVisible,
    filterActive,
    autoAnnotationPerformed,
    isProcessingAutoAnnotation,
    markupFileName,
    calibrationInputValue,
    setActiveTool,
    setActiveClassId,
    setLayerVisible,
    setFilterActive,
    setAutoAnnotationPerformed,
    setIsProcessingAutoAnnotation,
    setMarkupFileName,
    setCalibrationInputValue,
    handleToolChange,
    handleClassSelect,
    resetState
  } = useAppState();

  // Хук для файловых операций
  const { openFileDialog, handleSaveMarkup, handleOpenMarkup } = useFileOperations(
    showModal,
    closeModal,
    setMarkupFileName,
    setMarkupModifiedState,
    setAutoAnnotationPerformed
  );

  // Хук для обработки калибровки
  const { handleEditCalibration, handleCalibrationLineFinished } = useCalibrationHandlers(
    showModal,
    closeModal,
    calibrationInputValue,
    setCalibrationInputValue,
    setActiveTool
  );

  // Эффект синхронизации activeClassId с выделенным объектом
  useEffect(() => {
    if (annotations.selectedObjectId) {
      switch (annotations.selectedObjectType) {
        case 'bbox':
          const selectedBbox = annotations.boundingBoxes.find(bbox => bbox.id === annotations.selectedObjectId);
          if (selectedBbox) {
            handleToolChange('bbox');
            if (selectedBbox.classId >= 0 && selectedBbox.classId <= 10) {
              // Стандартный класс дефекта
              setActiveClassId(selectedBbox.classId);
            } else {
              // API класс
              setActiveClassId(-1);
            }
          }
          break;
        case 'ruler':
          handleToolChange('ruler');
          setActiveClassId(-1);
          break;
        case 'calibration':
          handleToolChange('calibration');
          setActiveClassId(-1);
          break;
        case 'density':
          handleToolChange('density');
          setActiveClassId(-1);
          break;
      }
    } else {
      // При сбросе выделения сбрасываем активный класс и инструмент
      setActiveClassId(-1);
      setActiveTool('');
    }
  }, [annotations.selectedObjectId, annotations.selectedObjectType, annotations.boundingBoxes, handleToolChange, setActiveClassId]);

  // Эффект синхронизации состояния калибровки
  useEffect(() => {
    if (!annotations.calibrationLine) {
      resetScale();
    }
  }, [annotations.calibrationLine, resetScale, handleToolChange]);

  const handleOpenFile = () => {
    // Проверка на несохраненные изменения
    if (markupModified) {
      showModal(MODAL_TYPES.CONFIRM, 'Несохраненные изменения', 'У вас есть несохраненные изменения в разметке. Что вы хотите сделать?', [
        { 
          text: 'Сохранить', 
          action: () => {
            handleSaveMarkup();
            closeModal();
            // После сохранения открываем новый файл
            setTimeout(() => openFileDialog(), 100);
          },
          primary: true
        },
        { 
          text: 'Не сохранять', 
          action: () => {
            closeModal();
            openFileDialog();
          }
        },
        { 
          text: 'Отмена', 
          action: closeModal
        }
      ]);
      return;
    }
    
    openFileDialog();
  };

  const handleClassSelectWrapper = useCallback((classId: number) => {
    if (!imageState.src) return;
    handleClassSelect(classId);
  }, [imageState.src, handleClassSelect]);

  const handleToolChangeWrapper = useCallback((tool: string) => {
    handleToolChange(tool);
    
    // Сбрасываем выделение и класс при выборе инструментов измерения
    if (tool === 'density' || tool === 'ruler' || tool === 'calibration') {
      selectObject(null, null);
      setActiveClassId(-1);
    }
  }, [handleToolChange, selectObject, setActiveClassId]);

  const handleDeleteSelected = useCallback(() => {
    // Реализация удаления выделенного объекта
    if (annotations.selectedObjectId) {
      // The delete functions in AnnotationManager will call setMarkupModified(true)
      setMarkupModifiedState(true);
      // Сбрасываем активный инструмент и класс после удаления объекта
      handleToolChange('');
      setActiveClassId(-1);
    }
  }, [annotations.selectedObjectId, setMarkupModifiedState, handleToolChange, setActiveClassId]);

  const handleAutoAnnotate = useCallback(async () => {
    if (!imageState.file || autoAnnotationPerformed) {
      showModal(MODAL_TYPES.ERROR, 'Ошибка', 'Сначала загрузите изображение', [
        { text: 'Ок', action: closeModal }
      ]);
      return;
    }

    setIsProcessingAutoAnnotation(true);
    showModal(MODAL_TYPES.INFO, 'Обработка', 'Обработка изображения...');

    try {
      const detections = await detectObjects(imageState.file);
      
      // Добавляем обнаруженные объекты как новые bounding boxes
      detections.forEach(detection => {
        const bbox = convertApiBboxToPixels(detection.bbox);
        
        // Ищем соответствие в JSON файле
        const jsonEntry = jsonData.find((entry: any) => {
          const entryName = entry.name.toLowerCase().trim();
          const detectionClass = detection.class.toLowerCase().trim();
          return entryName === detectionClass;
        });
        
        // Используем apiID из JSON файла как classId
        const classId = jsonEntry ? (jsonEntry as any).apiID : 10;
        
        addBoundingBox({
          x: bbox.x,
          y: bbox.y,
          width: bbox.width,
          height: bbox.height,
          classId,
          confidence: detection.confidence,
          apiClassName: detection.class,
          apiColor: detection.color,
          apiId: detection.id
        });
      });
      
      setAutoAnnotationPerformed(true);
      showModal(MODAL_TYPES.INFO, 'Успех', `Обнаружено объектов: ${detections.length}`, [
        { text: 'Ок', action: closeModal }
      ]);
    } catch (error) {
      showModal(MODAL_TYPES.ERROR, 'Ошибка', 'Не удалось выполнить автоматическую аннотацию', [
        { text: 'Ок', action: closeModal }
      ]);
    } finally {
      setIsProcessingAutoAnnotation(false);
    }
  }, [imageState.file, addBoundingBox, autoAnnotationPerformed, showModal, closeModal, setIsProcessingAutoAnnotation, setAutoAnnotationPerformed]);

  const handleBboxCreated = useCallback((bboxData: Omit<BoundingBox, 'id' | 'defectRecord' | 'formattedDefectString'>) => {
    // Проверяем, что это дефект (классы 0-9)
    if (bboxData.classId >= 0 && bboxData.classId <= 9) {
      const newBboxId = addBoundingBox(bboxData);
      selectObject(newBboxId, 'bbox');
      openDefectFormModal(newBboxId, bboxData.classId);
    } else {
      // Для других классов создаем рамку без диалога
      const newBboxId = addBoundingBox(bboxData);
      selectObject(newBboxId, 'bbox');
    }
  }, [addBoundingBox, selectObject, openDefectFormModal]);

  const handleCloseDefectModal = useCallback((shouldDelete: boolean = false) => {
    // Удаляем рамку только при отмене создания НОВОГО дефекта (когда нет initialRecord)
    if (shouldDelete && defectFormModalState.bboxId && !defectFormModalState.initialRecord) {
      deleteBoundingBox(defectFormModalState.bboxId);
      selectObject(null, null);
    }
    
    closeDefectFormModal();
  }, [defectFormModalState.bboxId, defectFormModalState.initialRecord, deleteBoundingBox, selectObject, closeDefectFormModal]);

  const handleEditDefectBbox = useCallback((bboxId: string) => {
    const bboxToEdit = annotations.boundingBoxes.find(bbox => bbox.id === bboxId);
    if (bboxToEdit) {
      selectObject(bboxId, 'bbox');
      openDefectFormModal(bboxId, bboxToEdit.classId, bboxToEdit.defectRecord || null);
    }
  }, [annotations.boundingBoxes, selectObject, openDefectFormModal]);

  const handleSaveDefectRecord = useCallback((bboxId: string, record: DefectRecord, formattedString: string) => {
    updateBoundingBoxDefectRecord(bboxId, record, formattedString);
    handleCloseDefectModal(false); // Не удаляем при сохранении
  }, [updateBoundingBoxDefectRecord, handleCloseDefectModal]);

  const handleHelp = useCallback(() => {
    showModal(MODAL_TYPES.HELP, 'О программе', 'Автор и разработчик Алексей Сотников\nТехнопарк "Университетские технологии"', [
      { text: 'Ок', action: closeModal }
    ]);
  }, [showModal, closeModal]);

  // Горячие клавиши
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
      // Проверяем, находится ли фокус на элементе ввода
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey;

      if (ctrl && key === 'o') {
        e.preventDefault();
        handleOpenFile();
      } else if (ctrl && key === 's') {
        e.preventDefault();
        handleSaveMarkup();
      } else if (ctrl && (key === '+' || key === '=')) {
        e.preventDefault();
        zoomIn();
      } else if (ctrl && key === '-') {
        e.preventDefault();
        zoomOut();
      } else if (ctrl && key === '1') {
        e.preventDefault();
        zoomReset();
      } else if (key === 'f') {
        e.preventDefault();
        const canvas = document.querySelector('canvas');
        if (canvas) {
          fitToCanvas(canvas.clientWidth, canvas.clientHeight);
        }
      } else if (key === 'i') {
        e.preventDefault();
        toggleInversion();
      } else if (key === 'd') {
        e.preventDefault();
        handleToolChangeWrapper('density');
      } else if (key === 'r') {
        e.preventDefault();
        handleToolChangeWrapper('ruler');
      } else if (key === 'c') {
        e.preventDefault();
        handleToolChangeWrapper('calibration');
      } else if (key === 'l') {
        e.preventDefault();
        setLayerVisible(!layerVisible);
      } else if (ctrl && key === 'l') {
        e.preventDefault();
        setFilterActive(!filterActive);
      } else if (key === 'f1' || (ctrl && key === 'h')) {
        e.preventDefault();
        handleHelp();
      } else if (key === 'escape') {
        e.preventDefault();
        handleToolChangeWrapper('');
        setActiveClassId(-1);
        // Сброс выделения объектов
        selectObject(null, null);
      } else if (key === 'delete') {
        e.preventDefault();
        handleDeleteSelected();
      }
  }, [
    handleOpenFile, handleSaveMarkup, zoomIn, zoomOut, zoomReset, fitToCanvas, 
    toggleInversion, layerVisible, setLayerVisible, filterActive, 
    setFilterActive, handleHelp, selectObject, handleDeleteSelected, handleToolChangeWrapper, setActiveClassId
  ]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Предупреждение при закрытии страницы
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (markupModified) { // Use markupModified from context
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [markupModified]); // Use markupModified from context
  
  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <Header />
      
      <Toolbar
        activeTool={activeTool}
        onToolChange={handleToolChangeWrapper}
        onOpenFile={handleOpenFile}
        onSaveMarkup={handleSaveMarkup}
        onAutoAnnotate={handleAutoAnnotate}
        onInvertColors={toggleInversion}
        onHelp={handleHelp}
        layerVisible={layerVisible}
        onToggleLayer={() => setLayerVisible(!layerVisible)}
        filterActive={filterActive}
        onToggleFilter={() => setFilterActive(!filterActive)}
        calibrationSet={calibration.isSet}
        onEditCalibration={handleEditCalibration}
        autoAnnotationPerformed={autoAnnotationPerformed}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          activeClassId={activeClassId}
          onClassSelect={handleClassSelectWrapper}
          disabled={!imageState.src}
        />
        
        <CanvasArea
          activeTool={activeTool}
          activeClassId={activeClassId}
          layerVisible={layerVisible}
          filterActive={filterActive}
          onToolChange={handleToolChangeWrapper}
          onSelectClass={setActiveClassId}
          onShowContextMenu={showContextMenu}
          onCalibrationLineFinished={handleCalibrationLineFinished}
          onBboxCreated={handleBboxCreated}
          onEditDefectBbox={handleEditDefectBbox}
        />
      </div>

      <StatusBar markupFileName={markupFileName} />

      {/* Модальные окна */}
      <Modal
        isOpen={modalState.type !== null || isProcessingAutoAnnotation}
        title={modalState.title}
        onClose={closeModal}
      >
        {modalState.message && (
          <p className="whitespace-pre-line mb-4">{modalState.message}</p>
        )}
        
        {modalState.type === MODAL_TYPES.CALIBRATION && (
          <div className="mt-4">
            <input
              type="number"
              step="0.1"
              min="0.1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={calibrationInputValue}
              onChange={(e) => setCalibrationInputValue(e.target.value)}
              placeholder="Введите размер в мм"
            />
          </div>
        )}
        
        <ModalButtons>
          {modalState.buttons?.map((button, index) => (
            <ModalButton
              key={index}
              onClick={button.action}
              primary={button.primary}
            >
              {button.text}
            </ModalButton>
          ))}
        </ModalButtons>
      </Modal>

      {/* Модальное окно для формы дефекта */}
      <DefectFormModal
        isOpen={defectFormModalState.isOpen}
        onClose={handleCloseDefectModal}
        bboxId={defectFormModalState.bboxId}
        defectClassId={defectFormModalState.defectClassId}
        initialRecord={defectFormModalState.initialRecord}
        onSaveRecord={handleSaveDefectRecord}
      />

      {/* Контекстное меню */}
      {contextMenu.visible && (
        <div
          className="fixed bg-white border border-gray-200 rounded shadow-lg z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className={`block w-full text-left px-4 py-2 text-sm ${
              annotations.densityPoints.length === 0 
                ? 'text-gray-400 cursor-not-allowed' 
                : 'hover:bg-gray-100 text-gray-900'
            }`}
            onClick={() => {
              if (annotations.densityPoints.length > 0) {
                clearAllDensityPoints();
                hideContextMenu();
              }
            }}
            disabled={annotations.densityPoints.length === 0}
          >
            Очистить все измерения плотности
          </button>
          <button
            className={`block w-full text-left px-4 py-2 text-sm ${
              annotations.rulers.length === 0 
                ? 'text-gray-400 cursor-not-allowed' 
                : 'hover:bg-gray-100 text-gray-900'
            }`}
            onClick={() => {
              if (annotations.rulers.length > 0) {
                clearAllRulers();
                hideContextMenu();
              }
            }}
            disabled={annotations.rulers.length === 0}
          >
            Очистить все линейки
          </button>
          <button
            className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
            onClick={() => {
              if (imageState.imageElement && imageState.file) {
                saveImageAsFile(
                  imageState.imageElement, 
                  imageState.width, 
                  imageState.height, 
                  annotations, 
                  `annotated_${imageState.file.name}`,
                  getOriginalPixelColor
                );
              }
              hideContextMenu();
            }}
            disabled={!imageState.src}
          >
            Сохранить изображение
          </button>
        </div>
      )}

      {/* Закрытие контекстного меню при клике вне */}
      {contextMenu.visible && (
        <div
          className="fixed inset-0 z-40"
          onClick={hideContextMenu}
        />
      )}
    </div>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <ImageProvider>
        <AnnotationProvider>
          <AppContent />
        </AnnotationProvider>
      </ImageProvider>
    </ErrorBoundary>
  );
}

export default App;