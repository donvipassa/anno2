import { useCallback } from 'react';
import { useImage } from '../core/ImageProvider';
import { useAnnotations } from '../core/AnnotationManager';
import { 
  validateImageFile, 
  getMarkupFileName, 
  downloadFile, 
  readFileAsText, 
  convertYOLOToPixels,
  validateMarkupFileName,
  validateYOLOData
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

  const validateAndShowError = useCallback((validation: { valid: boolean; error?: string }) => {
    if (!validation.valid) {
      const errorMessages = {
        'FILE_TOO_LARGE': 'Файл слишком большой. Максимум — 20 МБ',
        'INVALID_FORMAT': 'Недопустимый формат. Поддерживаются форматы: JPG, PNG, TIFF, BMP'
      };
      const message = errorMessages[validation.error as keyof typeof errorMessages] || 'Неизвестная ошибка';
      showModal('error', 'Ошибка', message, [
        { text: 'Ок', action: closeModal }
      ]);
      return false;
    }
    return true;
  }, [showModal, closeModal]);

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
        
        // Небольшая задержка для обеспечения обновления состояния
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Предложение загрузить разметку
        showModal('confirm', 'Загрузка разметки', 'Открыть файл разметки для данного изображения?', [
          { text: 'Да', action: () => { closeModal(); handleOpenMarkup(file.name); } },
          { text: 'Нет', action: closeModal }
        ]);
        
        // Очистка существующих аннотаций
        clearAll();
        setMarkupModifiedState(false);
        setMarkupFileName(null);
        setAutoAnnotationPerformed(false);
      } catch (error) {
        showModal('error', 'Ошибка', 'Не удалось загрузить изображение', [
          { text: 'Ок', action: closeModal }
        ]);
      }
    };
    input.click();
  }, [validateAndShowError, loadImage, showModal, closeModal, clearAll, setMarkupModifiedState, setMarkupFileName, setAutoAnnotationPerformed]);

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
        expectedFileName: getMarkupFileName(imageFileName)
      });

      if (!validateMarkupFileName(file.name, imageFileName)) {
        console.error('Валидация имени файла не прошла:', {
          markupFileName: file.name,
          imageFileName: imageFileName,
          expected: getMarkupFileName(imageFileName)
        });
        showModal('error', 'Ошибка', 'Файл разметки не соответствует файлу изображения. Загрузка отменена', [
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
          showModal('info', 'Успех', 'Файл разметки соответствует файлу изображения. Загрузка подтверждена', [
            { text: 'Ок', action: closeModal }
          ]);
        } else {
          // Проверяем, что изображение загружено
          if (!imageState.width || !imageState.height) {
            showModal('error', 'Ошибка', 'Не удалось загрузить файл разметки. Сначала загрузите изображение', [
              { text: 'Ок', action: closeModal }
            ]);
            return;
          }

          // Конвертация YOLO в пиксельные координаты
          const boundingBoxes = yoloData.map(data => {
            const bbox = convertYOLOToPixels(data, imageState.width, imageState.height);
            
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
        }
        console.log('Проверка состояния изображения:', {
          src: imageState.src,
          width: imageState.width,
          height: imageState.height,
          file: imageState.file?.name
        });
        
          setMarkupFileName(file.name);
        if (!imageState.src || !imageState.width || !imageState.height) {
          console.error('Изображение не загружено полностью:', {
            src: !!imageState.src,
            width: imageState.width,
            height: imageState.height
          });

          showModal('info', 'Успех', 'Файл разметки соответствует файлу изображения. Загрузка подтверждена', [
            { text: 'Ок', action: closeModal }
          ]);
        }
      } catch (error) {
        showModal('error', 'Ошибка', 'Не удалось загрузить файл разметки. Файл повреждён или имеет неверный формат', [
          { text: 'Ок', action: closeModal }
        ]);
      }
    };
    input.click();
  }, [showModal, closeModal, imageState.width, imageState.height, setMarkupFileName, setMarkupModifiedState, loadAnnotations]);

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