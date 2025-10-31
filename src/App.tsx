import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ImageProvider } from './core/ImageProvider';
import { AnnotationProvider } from './core/AnnotationManager';
import { DefectFormModal } from './components/DefectFormModal';
import { ContextMenuContainer } from './components/ContextMenuContainer';
import { ModalContainer } from './components/ModalContainer';
import { DefectRecord } from './types/defects';
import { BoundingBox } from './types';
import { Header, Toolbar, Sidebar, ObjectClassesSidebar, CanvasArea, StatusBar } from './ui';
import { useImage } from './core/ImageProvider';
import { useAnnotations } from './core/AnnotationManager';
import { useCalibration } from './core/CalibrationManager';
import { detectObjects } from './services/api';
import { convertApiBboxToPixels } from './utils';
import { useModalState } from './hooks/useModalState';
import { useDefectFormModal } from './hooks/useDefectFormModal';
import { useContextMenu } from './hooks/useContextMenu';
import { useFileOperations } from './hooks/useFileOperations';
import { useToolManagement } from './hooks/useToolManagement';
import { useCalibrationModal } from './hooks/useCalibrationModal';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useModalDialogs } from './hooks/useModalDialogs';
import { MODAL_TYPES } from './constants/modalTypes';
import jsonData from './data/defect-classes.json';
import defectsData from './data/defects_data.json';
import { DefectsData } from './types/defects';
import { formatDefectRecord } from './utils/formatDefectRecord';

interface DefectClassData {
  apiID: number;
  name: string;
  russian_name: string;
  color: [number, number, number];
  description?: string;
}

const typedJsonData = jsonData as DefectClassData[];

const AppContent: React.FC = () => {
  const {
    imageState,
    toggleInversion,
    toggleCLAHE,
    fitToCanvas,
    zoomIn,
    zoomOut,
    zoomReset,
    getOriginalPixelColor
  } = useImage();

  const {
    annotations,
    clearAllRulers,
    clearAllDensityPoints,
    selectObject,
    addBoundingBox,
    deleteBoundingBox,
    updateBoundingBox,
    updateBoundingBoxDefectRecord,
    updateCalibrationLine,
    markupModified,
    setMarkupModifiedState
  } = useAnnotations();

  const { calibration, setScale: setCalibrationScale } = useCalibration();

  const { modalState, closeModal, showModal } = useModalState();
  const { defectFormModalState, openDefectFormModal, closeDefectFormModal } = useDefectFormModal();
  const { contextMenu, showContextMenu, hideContextMenu } = useContextMenu();

  const [markupFileName, setMarkupFileName] = useState<string | null>(null);
  const [layerVisible, setLayerVisible] = useState<boolean>(true);
  const [filterActive, setFilterActive] = useState<boolean>(false);
  const [autoAnnotationPerformed, setAutoAnnotationPerformed] = useState<boolean>(false);
  const [isProcessingAutoAnnotation, setIsProcessingAutoAnnotation] = useState<boolean>(false);

  const isMountedRef = useRef<boolean>(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const {
    activeTool,
    activeClassId,
    handleClassSelect,
    handleToolChange,
    resetTools,
    setActiveTool
  } = useToolManagement();

  const {
    calibrationInputValue,
    calibrationInputRef,
    handleCalibrationLineFinished,
    setCalibrationInputValue
  } = useCalibrationModal(
    showModal,
    closeModal,
    setActiveTool,
    annotations.calibrationLine
  );

  const {
    showUnsavedChangesDialog,
    showAutoAnnotationSuccessDialog,
    showAutoAnnotationErrorDialog,
    showLoadImageRequiredDialog
  } = useModalDialogs(showModal, closeModal);

  const handleEditCalibration = useCallback(() => {
    if (!annotations.calibrationLine) return;

    const currentValue = annotations.calibrationLine.realLength.toString();
    setCalibrationInputValue(currentValue);

    showModal(MODAL_TYPES.CALIBRATION, 'Калибровка масштаба', 'Укажите реальный размер эталона для установки масштаба (мм):', [
      { text: 'Отмена', action: closeModal },
      {
        text: 'Применить',
        action: () => {
          const inputValue = calibrationInputRef.current?.value || calibrationInputValue;
          const realLength = parseFloat(inputValue);
          if (isNaN(realLength) || realLength <= 0) {
            alert('Пожалуйста, введите корректное положительное число');
            return;
          }
          updateCalibrationLine({ realLength });
          const pixelLength = Math.sqrt(
            (annotations.calibrationLine!.x2 - annotations.calibrationLine!.x1) ** 2 +
            (annotations.calibrationLine!.y2 - annotations.calibrationLine!.y1) ** 2
          );
          setCalibrationScale(pixelLength, realLength);
          setActiveTool('');
          closeModal();
        },
        primary: true
      }
    ]);
  }, [
    annotations.calibrationLine,
    setCalibrationInputValue,
    showModal,
    closeModal,
    calibrationInputRef,
    calibrationInputValue,
    updateCalibrationLine,
    setCalibrationScale,
    setActiveTool
  ]);

  const { openFileDialog, handleSaveMarkup, handleOpenMarkup } = useFileOperations(
    showModal,
    closeModal,
    setMarkupFileName,
    setMarkupModifiedState,
    setAutoAnnotationPerformed
  );

  const handleOpenFile = () => {
    if (markupModified) {
      showUnsavedChangesDialog(
        () => {
          handleSaveMarkup();
          closeModal();
          setTimeout(() => openFileDialog(), 100);
        },
        () => {
          closeModal();
          openFileDialog();
        },
        closeModal
      );
      return;
    }

    openFileDialog();
  };

  const handleHelp = () => {
    showModal(MODAL_TYPES.HELP, 'О программе', 'Автор и разработчик Алексей Сотников\nТехнопарк "Университетские технологии"',
      [{ text: 'Закрыть', action: closeModal }]
    );
  };

  const handleAnalyzeDefects = useCallback(() => {
    const bboxesWithDefects = annotations.boundingBoxes.filter(
      bbox => bbox.formattedDefectString && bbox.formattedDefectString.trim().length > 0
    );

    if (bboxesWithDefects.length === 0) {
      showModal(
        MODAL_TYPES.INFO,
        'Нет данных',
        'На снимке отсутствуют размеченные дефекты с заполненными данными.',
        [{ text: 'Закрыть', action: closeModal }]
      );
      return;
    }

    const defectCodes = bboxesWithDefects
      .map(bbox => bbox.formattedDefectString!.trim())
      .filter(code => code.length > 0);

    if (defectCodes.length === 0) {
      showModal(
        MODAL_TYPES.INFO,
        'Нет данных',
        'Не удалось извлечь условные обозначения дефектов.',
        [{ text: 'Закрыть', action: closeModal }]
      );
      return;
    }

    const prompt = `Расшифруй следующие условные записи дефектов на рентгеновском снимке согласно ГОСТ 7512-82:\n${defectCodes.map(code => `- ${code}`).join('\n')}`;

    const widget = document.querySelector('agent-chat-widget');

    if (!widget) {
      showModal(
        MODAL_TYPES.INFO,
        'Чат-бот не найден',
        'Не удалось найти чат-бот на странице. Запрос скопирован в буфер обмена.',
        [{ text: 'Закрыть', action: closeModal }]
      );
      navigator.clipboard.writeText(prompt);
      return;
    }

    const expandButton = widget.shadowRoot?.querySelector('.floating-button') as HTMLButtonElement;
    if (expandButton && !widget.shadowRoot?.querySelector('.widget-container')) {
      expandButton.click();
    }

    setTimeout(() => {
      const textarea = widget.shadowRoot?.querySelector('.message-input') as HTMLTextAreaElement;
      if (!textarea) {
        navigator.clipboard.writeText(prompt);
        showModal(
          MODAL_TYPES.INFO,
          'Запрос скопирован',
          'Не удалось найти поле ввода.\nЗапрос скопирован в буфер обмена.\nВставьте его в чат-бот вручную.',
          [{ text: 'Закрыть', action: closeModal }]
        );
        return;
      }

      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        'value'
      )?.set;

      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(textarea, prompt);
      } else {
        textarea.value = prompt;
      }

      textarea.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true, composed: true }));

      setTimeout(() => {
        const sendButton = widget.shadowRoot?.querySelector('.send-button') as HTMLButtonElement;
        if (sendButton && !sendButton.disabled) {
          sendButton.click();
        } else {
          navigator.clipboard.writeText(prompt);
          showModal(
            MODAL_TYPES.INFO,
            'Запрос готов',
            'Запрос вставлен в поле ввода чат-бота и скопирован в буфер обмена.\nНажмите кнопку отправки в чат-боте.',
            [{ text: 'Закрыть', action: closeModal }]
          );
        }
      }, 100);
    }, 500);
  }, [annotations.boundingBoxes, showModal, closeModal]);

  const handleDeleteSelected = useCallback(() => {
    if (annotations.selectedObjectId) {
      setMarkupModifiedState(true);
      resetTools();
    }
  }, [annotations.selectedObjectId, setMarkupModifiedState, resetTools]);

  const handleAutoAnnotate = useCallback(async () => {
    if (!imageState.file) {
      showLoadImageRequiredDialog();
      return;
    }

    setIsProcessingAutoAnnotation(true);
    showModal(MODAL_TYPES.INFO, 'Обработка', 'Обработка изображения...');

    try {
      const detections = await detectObjects(imageState.file);

      if (!isMountedRef.current) return;

      detections.forEach(detection => {
        const bbox = convertApiBboxToPixels(detection.bbox);

        const jsonEntry = typedJsonData.find((entry) => {
          const entryName = entry.name.toLowerCase().trim();
          const detectionClass = detection.class.toLowerCase().trim();
          return entryName === detectionClass;
        });

        const classId = jsonEntry ? jsonEntry.apiID : 10;

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

      if (isMountedRef.current) {
        showAutoAnnotationSuccessDialog(detections.length);
      }
    } catch (error) {
      if (isMountedRef.current) {
        showAutoAnnotationErrorDialog();
      }
    } finally {
      if (isMountedRef.current) {
        setIsProcessingAutoAnnotation(false);
      }
    }
  }, [imageState.file, addBoundingBox, showModal, closeModal, showAutoAnnotationSuccessDialog, showAutoAnnotationErrorDialog, showLoadImageRequiredDialog]);

  const handleBboxCreated = useCallback((bboxData: Omit<BoundingBox, 'id' | 'defectRecord' | 'formattedDefectString'>) => {
    if (bboxData.classId >= 0 && bboxData.classId <= 9) {
      const newBboxId = addBoundingBox(bboxData);
      selectObject(newBboxId, 'bbox');
      openDefectFormModal(newBboxId, bboxData.classId);
    } else {
      const newBboxId = addBoundingBox(bboxData);
      selectObject(newBboxId, 'bbox');
    }
  }, [addBoundingBox, selectObject, openDefectFormModal]);

  const handleCloseDefectModal = useCallback((shouldDelete: boolean = false) => {
    if (shouldDelete && defectFormModalState.bboxId) {
      deleteBoundingBox(defectFormModalState.bboxId);
      selectObject(null, null);
    }

    closeDefectFormModal();
  }, [defectFormModalState.bboxId, deleteBoundingBox, selectObject, closeDefectFormModal]);

  const handleEditDefectBbox = useCallback((bboxId: string) => {
    const bboxToEdit = annotations.boundingBoxes.find(bbox => bbox.id === bboxId);
    if (bboxToEdit) {
      selectObject(bboxId, 'bbox');
      openDefectFormModal(bboxId, bboxToEdit.classId, bboxToEdit.defectRecord || null);
    }
  }, [annotations.boundingBoxes, selectObject, openDefectFormModal]);

  const handleSaveDefectRecord = useCallback((bboxId: string, record: DefectRecord, formattedString: string) => {
    updateBoundingBoxDefectRecord(bboxId, record, formattedString);
    handleCloseDefectModal(false);
  }, [updateBoundingBoxDefectRecord, handleCloseDefectModal]);

  useKeyboardShortcuts(
    {
      onOpenFile: handleOpenFile,
      onSaveMarkup: handleSaveMarkup,
      onZoomIn: zoomIn,
      onZoomOut: zoomOut,
      onZoomReset: zoomReset,
      onFitToCanvas: () => {
        if (canvasRef.current) {
          fitToCanvas(canvasRef.current.clientWidth, canvasRef.current.clientHeight);
        }
      },
      onToggleInversion: toggleInversion,
      onToggleCLAHE: toggleCLAHE,
      onToggleLayer: () => setLayerVisible(!layerVisible),
      onToggleFilter: () => setFilterActive(!filterActive),
      onHelp: handleHelp,
      onDeleteSelected: handleDeleteSelected,
      onSelectTool: handleToolChange,
      onResetTools: resetTools
    },
    canvasRef
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);


  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <Header />

      <Toolbar
        activeTool={activeTool}
        onToolChange={handleToolChange}
        onOpenFile={handleOpenFile}
        onSaveMarkup={handleSaveMarkup}
        onAutoAnnotate={handleAutoAnnotate}
        onAnalyzeDefects={handleAnalyzeDefects}
        onInvertColors={toggleInversion}
        onToggleCLAHE={toggleCLAHE}
        onHelp={handleHelp}
        layerVisible={layerVisible}
        onToggleLayer={() => setLayerVisible(!layerVisible)}
        filterActive={filterActive}
        onToggleFilter={() => setFilterActive(!filterActive)}
        calibrationSet={calibration.isSet}
        onEditCalibration={handleEditCalibration}
        autoAnnotationPerformed={autoAnnotationPerformed}
        claheActive={imageState.claheActive}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          activeClassId={activeClassId}
          onClassSelect={(classId) => handleClassSelect(classId, !!imageState.src)}
          disabled={!imageState.src}
          boundingBoxes={annotations.boundingBoxes}
          selectedObjectId={annotations.selectedObjectId}
          selectedObjectType={annotations.selectedObjectType}
          onUpdateBoundingBox={updateBoundingBox}
        />

        <CanvasArea
          canvasRef={canvasRef}
          activeTool={activeTool}
          activeClassId={activeClassId}
          layerVisible={layerVisible}
          filterActive={filterActive}
          onToolChange={handleToolChange}
          onSelectClass={handleClassSelect}
          onShowContextMenu={showContextMenu}
          onCalibrationLineFinished={handleCalibrationLineFinished}
          onBboxCreated={handleBboxCreated}
          onEditDefectBbox={handleEditDefectBbox}
          onEditCalibration={handleEditCalibration}
        />

        <ObjectClassesSidebar
          activeClassId={activeClassId}
          onClassSelect={(classId) => handleClassSelect(classId, !!imageState.src)}
          disabled={!imageState.src}
          boundingBoxes={annotations.boundingBoxes}
          selectedObjectId={annotations.selectedObjectId}
          selectedObjectType={annotations.selectedObjectType}
          onUpdateBoundingBox={updateBoundingBox}
        />
      </div>

      <StatusBar
        markupFileName={markupFileName}
        imageFileName={imageState.file?.name || null}
        imageScale={imageState.scale}
        hasImage={!!imageState.src}
        calibrationLine={annotations.calibrationLine}
        selectedObjectId={annotations.selectedObjectId}
        boundingBoxes={annotations.boundingBoxes}
      />

      <ModalContainer
        isOpen={modalState.type !== null || isProcessingAutoAnnotation}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        buttons={modalState.buttons}
        calibrationInputValue={calibrationInputValue}
        calibrationInputRef={calibrationInputRef}
        onCalibrationInputChange={setCalibrationInputValue}
        onClose={closeModal}
      />

      <DefectFormModal
        isOpen={defectFormModalState.isOpen}
        onClose={handleCloseDefectModal}
        bboxId={defectFormModalState.bboxId}
        defectClassId={defectFormModalState.defectClassId}
        initialRecord={defectFormModalState.initialRecord}
        onSaveRecord={handleSaveDefectRecord}
      />

      <ContextMenuContainer
        visible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        annotations={annotations}
        imageState={imageState}
        onClearDensityPoints={clearAllDensityPoints}
        onClearRulers={clearAllRulers}
        onHide={hideContextMenu}
        getOriginalPixelColor={getOriginalPixelColor}
      />
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
