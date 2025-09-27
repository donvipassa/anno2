import { useCallback } from 'react';
import { useAnnotations } from '../core/AnnotationManager';
import { useImage } from '../core/ImageProvider';
import { getMarkupFileName, readFileAsText, convertYOLOToPixels } from '../utils/fileUtils';
import { validateMarkupFileName, validateYOLOData } from '../utils/validation';
import jsonData from '../data/defect-classes.json';

export const useFileOperations = (
  showModal: (type: string, title: string, message: string, buttons?: any[]) => void,
  closeModal: () => void,
  setMarkupFileName: (name: string | null) => void,
  setMarkupModifiedState: (modified: boolean) => void,
  setAutoAnnotationPerformed: (performed: boolean) => void
) => {
  const { imageState, loadImage } = useImage();
  const { annotations, loadAnnotations, getYOLOExport, clearAll } = useAnnotations();

  const openFileDialog = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        await loadImage(file);
        clearAll();
        setMarkupFileName(null);
        setMarkupModifiedState(false);
        setAutoAnnotationPerformed(false);
      } catch (error) {
        showModal('error', 'Ошибка', 'Не удалось загрузить изображение', [
          { text: 'Ок', action: closeModal }
        ]);
      }
    };
    input.click();
  }, [loadImage, clearAll, setMarkupFileName, setMarkupModifiedState, setAutoAnnotationPerformed, showModal, closeModal]);

  const handleSaveMarkup = useCallback(() => {
    if (!imageState.file) {
      showModal('error', 'Ошибка', 'Сначала загрузите изображение', [
        { text: 'Ок', action: closeModal }
      ]);
      return;
    }

    const yoloData = getYOLOExport(imageState.width, imageState.height);
    const content = yoloData.map(item => 
      `${item.classId} ${item.x} ${item.y} ${item.width} ${item.height}`
    ).join('\n');

    const fileName = getMarkupFileName(imageState.file.name);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);

    setMarkupFileName(fileName);
    setMarkupModifiedState(false);
  }, [imageState.file, imageState.width, imageState.height, getYOLOExport, setMarkupFileName, setMarkupModifiedState, showModal, closeModal]);

  const handleOpenMarkup = useCallback((imageFileName: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      if (!validateMarkupFileName(file.name, imageFileName)) {
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
          setMarkupFileName(file.name);
          setMarkupModifiedState(false);

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

  return {
    openFileDialog,
    handleSaveMarkup,
    handleOpenMarkup
  };
};