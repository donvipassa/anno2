import { useCallback, useRef, useEffect } from 'react';
import { useImage } from '../core/ImageProvider';
import { useAnnotations } from '../core/AnnotationManager';
import { 
  validateImageFile, 
  getMarkupFileName, 
  downloadFile, 
  readFileAsText, 
  convertYOLOToPixels,
  validateMarkupFileName,
  validateYOLOData,
  MODAL_TYPES
} from '../utils';
import jsonData from '../data/defect-classes.json';

export const useFileOperations = (
  showModal: (type: string, title: string, message: string, buttons?: any[]) => void,
  closeModal: () => void,
  setMarkupFileName: (fileName: string | null) => void,
  setMarkupModifiedState: (modified: boolean) => void,
  setAutoAnnotationPerformed: (performed: boolean) => void
) => {
  const { imageState, loadImage } = useImage();
  const { annotations, loadAnnotations, clearAll, getYOLOExport } = useAnnotations();
  
  // Use ref to store latest imageState to avoid stale closures
  const imageStateRef = useRef(imageState);
  
  // Update ref whenever imageState changes
  useEffect(() => {
    imageStateRef.current = imageState;
  }, [imageState]);

  const validateAndShowError = useCallback((validation: { valid: boolean; error?: string }) => {
    if (!validation.valid) {
      const errorMessages = {
        'FILE_TOO_LARGE': 'Файл слишком большой. Максимум — 20 МБ',
        'INVALID_FORMAT': 'Недопустимый формат. Поддерживаются форматы: JPG, PNG, TIFF, BMP'
      };
      const message = errorMessages[validation.error as keyof typeof errorMessages] || 'Неизвестная ошибка';
      showModal(MODAL_TYPES.ERROR, 'Ошибка', message, [
        { text: 'Ок', action: closeModal }
      ]);
      return false;
    }
    return true;
  }, [showModal, closeModal]);

  const handleOpenMarkup = useCallback((imageFileName: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      console.log('Загрузка файла разметки:', {
        markupFileName: file.name,
        imageFileName: imageFileName,
        expectedFileName: getMarkupFileName(imageFileName),
        imageState: {
          src: !!imageState.src,
          width: imageState.width,
          height: imageState.height,
          file: imageState.file?.name
        }
      });

      if (!validateMarkupFileName(file.name, imageFileName)) {
        console.error('Валидация имени файла не прошла:', {
          markupFileName: file.name,
          imageFileName: imageFileName,
          expected: getMarkupFileName(imageFileName)
        });
        showModal(MODAL_TYPES.ERROR, 'Ошибка', 'Файл разметки не соответствует файлу изображения. Загрузка отменена', [
          { text: 'Ок', action: closeModal }
        ]);
        return;
      }

      try {
        const content = await readFileAsText(file);
        const yoloData = validateYOLOData(content);
        
        if (yoloData.length === 0) {
          // Пустой файл разметки - это нормально
          setMarkupFileName(file.name);
          setMarkupModifiedState(false);
          showModal(MODAL_TYPES.INFO, 'Успех', 'Файл разметки соответствует файлу изображения. Загрузка подтверждена', [
            { text: 'Ок', action: closeModal }
          ]);
        } else {
          // Проверяем, что изображение загружено полностью
          if (!imageStateRef.current.src || !imageStateRef.current.width || !imageStateRef.current.height || !imageStateRef.current.imageElement) {
            console.error('Изображение не загружено полностью:', {
              src: !!imageStateRef.current.src,
              width: imageStateRef.current.width,
              height: imageStateRef.current.height,
              imageElement: !!imageStateRef.current.imageElement
            });
            showModal(MODAL_TYPES.ERROR, 'Ошибка', 'Не удалось загрузить файл разметки. Сначала загрузите изображение', [
              { text: 'Ок', action: closeModal }
            ]);
            return;
          }

          // Конвертация YOLO в пиксельные координаты
          const boundingBoxes = yoloData.map(data => {
            const bbox = convertYOLOToPixels(data, imageStateRef.current.width, imageStateRef.current.height);
            
            // Если это класс от API (ID >= 12), добавляем информацию из JSON
            if (data.classId >= 12) {
              const jsonEntry = jsonData.find((entry: any) => entry.apiID === data.classId);
              if (jsonEntry) {
                bbox.apiClassName = jsonEntry.name;
                bbox.apiColor = jsonEntry.color;
                bbox.apiId = jsonEntry.apiID;
              }
            }
            
            return bbox;
          });
          loadAnnotations({ boundingBoxes });
          setMarkupFileName(file.name);
          setMarkupModifiedState(false);
          showModal(MODAL_TYPES.INFO, 'Успех', `Файл разметки загружен. Найдено объектов: ${boundingBoxes.length}`, [
            { text: 'Ок', action: closeModal }
          ]);
        }
      } catch (error) {
        console.error('Ошибка при загрузке файла разметки:', error);
        showModal(MODAL_TYPES.ERROR, 'Ошибка', 'Не удалось загрузить файл разметки. Файл повреждён или имеет неверный формат', [
          { text: 'Ок', action: closeModal }
        ]);
      }
    };
    input.click();
  }, [showModal, closeModal, setMarkupFileName, setMarkupModifiedState, loadAnnotations]);

  const openFileDialog = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const validation = validateImageFile(file);
      if (!validateAndShowError(validation)) return;

      try {
        await loadImage(file);
        
        // Предложение загрузить разметку
        showModal(MODAL_TYPES.CONFIRM, 'Загрузка разметки', 'Открыть файл разметки для данного изображения?', [
          { text: 'Да', action: () => { 
            closeModal(); 
            handleOpenMarkup(file.name);
          } },
          { text: 'Нет', action: closeModal }
        ]);
        
        // Очистка существующих аннотаций
        clearAll();
        setMarkupModifiedState(false);
        setMarkupFileName(null);
        setAutoAnnotationPerformed(false);
      } catch (error) {
        showModal(MODAL_TYPES.ERROR, 'Ошибка', 'Не удалось загрузить изображение', [
          { text: 'Ок', action: closeModal }
        ]);
      }
    };
    input.click();
  }, [validateAndShowError, loadImage, showModal, closeModal, clearAll, setMarkupModifiedState, setMarkupFileName, setAutoAnnotationPerformed, handleOpenMarkup]);

  const handleSaveMarkup = useCallback(() => {
    if (annotations.boundingBoxes.length === 0) return;

    const yoloContent = getYOLOExport(imageState.width, imageState.height);
    const fileName = getMarkupFileName(imageState.file?.name || 'markup');
    
    downloadFile(yoloContent, fileName);
    setMarkupFileName(fileName);
    setMarkupModifiedState(false);
  }, [annotations.boundingBoxes.length, getYOLOExport, imageState.width, imageState.height, imageState.file?.name, setMarkupFileName, setMarkupModifiedState]);

  return {
    openFileDialog,
    handleOpenMarkup,
    handleSaveMarkup
  };
};