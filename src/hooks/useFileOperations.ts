import { useCallback } from 'react';
import { useImage } from '../core/ImageProvider';
import { useAnnotations } from '../core/AnnotationManager';
import jsonData from '../data/defect-classes.json';

interface ModalButton {
  text: string;
  action: () => void;
  primary?: boolean;
}

export const useFileOperations = (
  showModal: (type: string, title: string, message: string, buttons?: ModalButton[]) => void,
  closeModal: () => void,
  setMarkupFileName: (fileName: string | null) => void,
  setMarkupModifiedState: (modified: boolean) => void,
  setAutoAnnotationPerformed: (performed: boolean) => void
) => {
  const { imageState, loadImage } = useImage();
  const { loadAnnotations, getYOLOExport, clearAll } = useAnnotations();

  const openFileDialog = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        loadImage(file);
        clearAll();
        setMarkupFileName(null);
        setMarkupModifiedState(false);
        setAutoAnnotationPerformed(false);
        
        // Предложить загрузить файл разметки
        const baseName = file.name.replace(/\.[^/.]+$/, "");
        showModal('confirm', 'Загрузка разметки', `Хотите загрузить файл разметки для изображения "${file.name}"?`, [
          {
            text: 'Да',
            action: () => {
              closeModal();
              handleOpenMarkup();
            },
            primary: true
          },
          {
            text: 'Нет',
            action: closeModal
          }
        ]);
      }
    };
    input.click();
  }, [loadImage, clearAll, setMarkupFileName, setMarkupModifiedState, setAutoAnnotationPerformed, showModal, closeModal]);

  const handleOpenMarkup = useCallback(() => {
    if (!imageState.src) {
      showModal('error', 'Ошибка', 'Сначала загрузите изображение', [
        { text: 'Ок', action: closeModal }
      ]);
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // Проверяем соответствие имени файла разметки и изображения
        const markupBaseName = file.name.replace(/\.[^/.]+$/, "");
        const imageBaseName = imageState.file?.name.replace(/\.[^/.]+$/, "") || '';
        
        if (markupBaseName !== imageBaseName) {
          showModal('error', 'Ошибка', `Имя файла разметки "${file.name}" не соответствует имени изображения "${imageState.file?.name}". Файлы должны иметь одинаковые имена.`, [
            { text: 'Ок', action: closeModal }
          ]);
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const content = e.target?.result as string;
            const lines = content.trim().split('\n').filter(line => line.trim());
            
            if (lines.length === 0) {
              showModal('info', 'Информация', 'Файл разметки пуст', [
                { text: 'Ок', action: closeModal }
              ]);
              return;
            }

            const annotations: any[] = [];
            
            lines.forEach((line, index) => {
              const parts = line.trim().split(/\s+/);
              if (parts.length >= 5) {
                const classId = parseInt(parts[0]);
                const centerX = parseFloat(parts[1]);
                const centerY = parseFloat(parts[2]);
                const width = parseFloat(parts[3]);
                const height = parseFloat(parts[4]);
                
                // Проверяем валидность данных
                if (isNaN(classId) || isNaN(centerX) || isNaN(centerY) || isNaN(width) || isNaN(height)) {
                  console.warn(`Некорректные данные в строке ${index + 1}: ${line}`);
                  return;
                }
                
                // Конвертируем из нормализованных координат YOLO в пиксели
                const imgWidth = imageState.width;
                const imgHeight = imageState.height;
                
                const pixelWidth = width * imgWidth;
                const pixelHeight = height * imgHeight;
                const pixelX = (centerX * imgWidth) - (pixelWidth / 2);
                const pixelY = (centerY * imgHeight) - (pixelHeight / 2);
                
                // Находим соответствующий класс в JSON данных
                let apiClassName = '';
                let apiColor = '#ff0000';
                
                const jsonEntry = jsonData.find((entry: any) => entry.apiID === classId);
                if (jsonEntry) {
                  apiClassName = (jsonEntry as any).name;
                  apiColor = (jsonEntry as any).color || '#ff0000';
                }
                
                annotations.push({
                  type: 'bbox',
                  x: Math.max(0, pixelX),
                  y: Math.max(0, pixelY),
                  width: Math.min(pixelWidth, imgWidth - pixelX),
                  height: Math.min(pixelHeight, imgHeight - pixelY),
                  classId: classId,
                  apiClassName: apiClassName,
                  apiColor: apiColor
                });
              }
            });
            
            if (annotations.length > 0) {
              loadAnnotations(annotations);
              setMarkupFileName(file.name);
              setMarkupModifiedState(false);
              showModal('info', 'Успех', `Загружено объектов: ${annotations.length}`, [
                { text: 'Ок', action: closeModal }
              ]);
            } else {
              showModal('error', 'Ошибка', 'Не удалось загрузить ни одного объекта из файла разметки', [
                { text: 'Ок', action: closeModal }
              ]);
            }
          } catch (error) {
            console.error('Ошибка при загрузке файла разметки:', error);
            showModal('error', 'Ошибка', 'Не удалось загрузить файл разметки', [
              { text: 'Ок', action: closeModal }
            ]);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, [imageState, loadAnnotations, setMarkupFileName, setMarkupModifiedState, showModal, closeModal]);

  const handleSaveMarkup = useCallback(() => {
    if (!imageState.src) {
      showModal('error', 'Ошибка', 'Нет загруженного изображения для сохранения разметки', [
        { text: 'Ок', action: closeModal }
      ]);
      return;
    }

    try {
      const yoloData = getYOLOExport(imageState.width, imageState.height);
      
      if (yoloData.trim() === '') {
        showModal('info', 'Информация', 'Нет аннотаций для сохранения', [
          { text: 'Ок', action: closeModal }
        ]);
        return;
      }

      const blob = new Blob([yoloData], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const baseName = imageState.file?.name.replace(/\.[^/.]+$/, "") || 'markup';
      a.download = `${baseName}.txt`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setMarkupFileName(`${baseName}.txt`);
      setMarkupModifiedState(false);
      
      showModal('info', 'Успех', 'Разметка успешно сохранена', [
        { text: 'Ок', action: closeModal }
      ]);
    } catch (error) {
      console.error('Ошибка при сохранении разметки:', error);
      showModal('error', 'Ошибка', 'Не удалось сохранить разметку', [
        { text: 'Ок', action: closeModal }
      ]);
    }
  }, [imageState, getYOLOExport, setMarkupFileName, setMarkupModifiedState, showModal, closeModal]);

  return {
    openFileDialog,
    handleSaveMarkup,
    handleOpenMarkup
  };
};