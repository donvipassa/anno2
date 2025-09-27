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
import { detectObjects } from './services/api';
import { mapApiClassToDefectClassId, convertApiBboxToPixels } from './utils';
import { useModalState } from './hooks/useModalState';
import { useDefectFormModal } from './hooks/useDefectFormModal';
import { useContextMenu } from './hooks/useContextMenu';
import { useFileOperations } from './hooks/useFileOperations';
import jsonData from './data/defect-classes.json';

// Константы для модальных окон
const MODAL_TYPES = {
  INFO: 'info',
  CONFIRM: 'confirm',
  ERROR: 'error',
  CALIBRATION: 'calibration',
  HELP: 'help'
} as const;

const AppContent: React.FC = () => {
  // Хуки для управления состоянием
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
  
  const { 
    annotations, 
    getYOLOExport, 
    clearAllRulers, 
    clearAllDensityPoints, 
    loadAnnotations, 
    clearAll, 
    selectObject, 
    addBoundingBox,
    deleteBoundingBox,
    updateBoundingBoxDefectRecord,
    setCalibrationLine,
    updateCalibrationLine,
    markupModified,
    setMarkupModifiedState
  } = useAnnotations();
  
  const { calibration, setScale: setCalibrationScale, resetScale } = useCalibration();

  // Хуки для управления UI состоянием
  const { modalState, closeModal, showModal } = useModalState();
  const { defectFormModalState, openDefectFormModal, closeDefectFormModal } = useDefectFormModal();
  const { contextMenu, showContextMenu, hideContextMenu } = useContextMenu();

  // Локальное состояние компонента
  const [markupFileName, setMarkupFileName] = useState<string | null>(null);
  const [isProcessingAutoAnnotation, setIsProcessingAutoAnnotation] = useState<boolean>(false);
  const [activeTool, setActiveTool] = useState<string>('');
  const [activeClassId, setActiveClassId] = useState<number>(-1);
  const [layerVisible, setLayerVisible] = useState<boolean>(true);
  const [filterActive, setFilterActive] = useState<boolean>(false);
  const [autoAnnotationPerformed, setAutoAnnotationPerformed] = useState<boolean>(false);

  // Состояние калибровки
  const [pendingCalibrationLine, setPendingCalibrationLine] = useState<any>(null);
  const [calibrationInputValue, setCalibrationInputValue] = useState<string>('50');

  // Хук для файловых операций
  const { openFileDialog, handleSaveMarkup } = useFileOperations(
    showModal,
    closeModal,
    setMarkupFileName,
    setMarkupModifiedState,
    setAutoAnnotationPerformed,
    imageState
  );

  // Эффект синхронизации activeClassId с выделенным объектом
  useEffect(() => {
    if (annotations.selectedObjectId) {
      switch (annotations.selectedObjectType) {
        case 'bbox':
          const selectedBbox = annotations.boundingBoxes.find(bbox => bbox.id === annotations.selectedObjectId);
          if (selectedBbox) {
            setActiveTool('bbox');
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
    // Не сбрасываем инструменты при selectedObjectId === null, 
    // чтобы пользователь мог продолжить рисование
  }, [annotations.selectedObjectId, annotations.selectedObjectType, annotations.boundingBoxes]);

  // Эффект синхронизации состояния калибровки
  useEffect(() => {
    if (!annotations.calibrationLine) {
      resetScale();
      setActiveTool(''); // Сбрасываем активный инструмент при удалении калибровочной линии
    }
  }, [annotations.calibrationLine, resetScale]);

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

  const handleClassSelect = useCallback((classId: number) => {
    if (!imageState.src) return;
    
    setActiveClassId(classId);
    setActiveTool('bbox');
  }, [imageState.src]);

  const handleToolChange = useCallback((tool: string) => {
    setActiveTool(tool);
    
    // Сбрасываем выделение и класс при выборе инструментов измерения
    if (tool === 'density' || tool === 'ruler' || tool === 'calibration') {
      selectObject(null, null);
      setActiveClassId(-1);
    }
  }, [selectObject]);

  const handleDeleteSelected = useCallback(() => {
    // Реализация удаления выделенного объекта
    if (annotations.selectedObjectId) {
      // The delete functions in AnnotationManager will call setMarkupModified(true)
      setMarkupModifiedState(true);
      // Сбрасываем активный инструмент и класс после удаления объекта
      setActiveTool('');
      setActiveClassId(-1);
    }
  }, [annotations.selectedObjectId]);

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
  }, [imageState.file, addBoundingBox, autoAnnotationPerformed]);

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
  }, [addBoundingBox, selectObject]);

  const handleEditDefectBbox = useCallback((bboxId: string) => {
    const bboxToEdit = annotations.boundingBoxes.find(bbox => bbox.id === bboxId);
    if (bboxToEdit) {
      selectObject(bboxId, 'bbox');
      openDefectFormModal(bboxId, bboxToEdit.classId, bboxToEdit.defectRecord || null);
    }
  }, [annotations.boundingBoxes, selectObject]);

  const handleSaveDefectRecord = useCallback((bboxId: string, record: DefectRecord, formattedString: string) => {
    updateBoundingBoxDefectRecord(bboxId, record, formattedString);
    closeDefectFormModal();
  }, [updateBoundingBoxDefectRecord]);

  const handleHelp = useCallback(() => {
    showModal(MODAL_TYPES.HELP, 'О программе', 'Автор и разработчик Алексей Сотников\nТехнопарк "Университетские технологии"', [
      { text: 'Ок', action: closeModal }
    ]);
  }, [showModal, closeModal]);

  const handleEditCalibration = useCallback(() => {
    if (annotations.calibrationLine) {
      // При редактировании устанавливаем текущее значение
      const currentValue = annotations.calibrationLine.realLength.toString();
      console.log('handleEditCalibration: текущее значение', currentValue);
      
      showModal(MODAL_TYPES.CALIBRATION, 'Калибровка масштаба', 'Укажите реальный размер эталона для установки масштаба (мм):',
        [
          { 
            text: 'Отмена', 
            action: () => {
              console.log('Отмена калибровки');
              closeModal();
            }
          },
          { 
            text: 'Применить', 
            action: () => {
              // Получаем значение из поля ввода в момент нажатия кнопки
              const inputElement = document.querySelector('input[type="number"]') as HTMLInputElement;
              const inputValue = inputElement ? inputElement.value : calibrationInputValue;
              console.log('Применить нажато, значение:', inputValue);
              
              const realLength = parseFloat(inputValue);
              if (isNaN(realLength) || realLength <= 0) {
                alert('Пожалуйста, введите корректное положительное число');
                return;
              }
              
              try {
                const lineToCalculateFrom = annotations.calibrationLine;
                console.log('Используем существующую calibrationLine:', lineToCalculateFrom);
                
                if (!lineToCalculateFrom) {
                  console.error('Нет данных линии для расчета');
                  alert('Ошибка: нет данных линии для расчета');
                  closeModal();
                  return;
                }
                
                const pixelLength = Math.sqrt(
                  (lineToCalculateFrom.x2 - lineToCalculateFrom.x1) ** 2 + 
                  (lineToCalculateFrom.y2 - lineToCalculateFrom.y1) ** 2
                );
                
                console.log('Пиксельная длина:', pixelLength);
                
                updateCalibrationLine({
                  realLength: realLength
                });
                console.log('Обновлена калибровочная линия:', realLength, 'мм');
                
                const scale = realLength / pixelLength;
                setCalibrationScale(pixelLength, realLength);
                console.log('Установлен масштаб:', scale, 'мм/пиксель');

                setActiveTool(''); // Сбрасываем активный инструмент после успешной калибровки
                closeModal();
              } catch (error) {
                console.error('Ошибка при установке калибровки:', error);
                closeModal();
                alert('Произошла ошибка при установке калибровки');
              }
            },
            primary: true
          }
        ]
      );
      
      // Устанавливаем значение ПОСЛЕ показа модального окна
      setTimeout(() => {
        setCalibrationInputValue(currentValue);
      }, 100);
    }
  }, [annotations.calibrationLine, showModal, closeModal, updateCalibrationLine, setCalibrationScale]);

  const handleCalibrationLineFinished = useCallback((lineData: any, isNew: boolean) => {
    console.log('handleCalibrationLineFinished вызвана:', { lineData, isNew });
    
    // Определяем значение по умолчанию
    let defaultLength = '50';
    if (!isNew && annotations.calibrationLine) {
      // При редактировании существующей линии используем её текущее значение
      defaultLength = annotations.calibrationLine.realLength.toString();
    } else if (lineData?.realLength) {
      // Если в lineData есть realLength, используем его
      defaultLength = lineData.realLength.toString();
    }
    
    setCalibrationInputValue(defaultLength);
    showModal(MODAL_TYPES.CALIBRATION, 'Калибровка масштаба', 'Укажите реальный размер эталона для установки масштаба (мм):',
      [
        { 
          text: 'Отмена', 
          action: () => {
            setCalibrationInputValue('50');
            closeModal();
          }
        },
        { 
          text: 'Применить', 
          action: () => {
            // Получаем значение из поля ввода в момент нажатия кнопки
            const inputElement = document.querySelector('input[type="number"]') as HTMLInputElement;
            const inputValue = inputElement ? inputElement.value : calibrationInputValue;
            console.log('Применить нажато, значение:', inputValue);
            console.log('isNew:', isNew);
            console.log('lineData:', lineData);
            console.log('annotations.calibrationLine:', annotations.calibrationLine);
            
            const realLength = parseFloat(inputValue);
            if (isNaN(realLength) || realLength <= 0) {
              alert('Пожалуйста, введите корректное положительное число');
              return;
            }
            
            try {
              // Определяем, какую линию использовать для расчетов
              let lineToCalculateFrom;
              if (isNew) {
                lineToCalculateFrom = lineData;
                console.log('Используем lineData для новой линии:', lineToCalculateFrom);
              } else {
                lineToCalculateFrom = annotations.calibrationLine;
                console.log('Используем существующую calibrationLine:', lineToCalculateFrom);
              }
              
              if (!lineToCalculateFrom) {
                console.error('Нет данных линии для расчета. isNew:', isNew, 'lineData:', lineData, 'calibrationLine:', annotations.calibrationLine);
                alert('Ошибка: нет данных линии для расчета. Попробуйте нарисовать линию заново.');
                closeModal();
                return;
              }
              
              // Вычисляем пиксельную длину
              const pixelLength = Math.sqrt(
                (lineToCalculateFrom.x2 - lineToCalculateFrom.x1) ** 2 + 
                (lineToCalculateFrom.y2 - lineToCalculateFrom.y1) ** 2
              );
              
              console.log('Пиксельная длина:', pixelLength);
              
              if (isNew) {
                console.log('Создаем новую калибровочную линию:', lineData);
                setCalibrationLine({
                  ...lineData,
                  realLength: realLength
                });
                console.log('Создана новая калибровочная линия:', realLength, 'мм, пиксельная длина:', pixelLength);
              } else if (!isNew && annotations.calibrationLine) {
                updateCalibrationLine({
                  realLength: realLength
                });
                console.log('Обновлена калибровочная линия:', realLength, 'мм');
              }
              
              // Устанавливаем масштаб
              const scale = realLength / pixelLength;
              setCalibrationScale(pixelLength, realLength);
              console.log('Установлен масштаб:', scale, 'мм/пиксель');

              closeModal();
            } catch (error) {
              console.error('Ошибка при установке калибровки:', error);
              closeModal();
              alert('Произошла ошибка при установке калибровки');
            }
          },
          primary: true
        }
      ]
    );
    
    // Устанавливаем значение ПОСЛЕ показа модального окна
    setTimeout(() => {
      setCalibrationInputValue(defaultLength);
    }, 100);
  }, [annotations.calibrationLine, setCalibrationLine, updateCalibrationLine, setCalibrationScale, showModal, closeModal]);

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
        handleToolChange('density');
      } else if (key === 'r') {
        e.preventDefault();
        handleToolChange('ruler');
      } else if (key === 'c') {
        e.preventDefault();
        handleToolChange('calibration');
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
        handleToolChange('');
        setActiveClassId(-1);
        // Сброс выделения объектов
        selectObject(null, null);
      } else if (key === 'delete') {
        e.preventDefault();
        handleDeleteSelected();
      }
  }, [
    handleOpenFile, handleSaveMarkup, zoomIn, zoomOut, zoomReset, fitToCanvas, 
    toggleInversion, setActiveTool, layerVisible, setLayerVisible, filterActive, 
    setFilterActive, handleHelp, selectObject, handleDeleteSelected, handleClassSelect, handleToolChange
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
        onToolChange={handleToolChange}
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
          onClassSelect={handleClassSelect}
          disabled={!imageState.src}
        />
        
        <CanvasArea
          activeTool={activeTool}
          activeClassId={activeClassId}
          layerVisible={layerVisible}
          filterActive={filterActive}
          onToolChange={handleToolChange}
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
        onClose={closeDefectFormModal}
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