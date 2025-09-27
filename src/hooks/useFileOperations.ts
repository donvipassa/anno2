import { useCallback } from 'react';
import { useImage } from '../core/ImageProvider';
import { useAnnotations } from '../core/AnnotationManager';

interface ModalButton {
  text: string;
  action: () => void;
  primary?: boolean;
}

interface UseFileOperationsProps {
  showModal: (type: string, title: string, message: string, buttons?: ModalButton[]) => void;
  closeModal: () => void;
  setMarkupFileName: (fileName: string | null) => void;
  setMarkupModifiedState: (modified: boolean) => void;
  setAutoAnnotationPerformed: (performed: boolean) => void;
  imageState: any;
}

export const useFileOperations = ({
  showModal,
  closeModal,
  setMarkupFileName,
  setMarkupModifiedState,
  setAutoAnnotationPerformed,
  imageState
}: UseFileOperationsProps) => {
  const { loadImage } = useImage();
  const { loadAnnotations, getYOLOExport, clearAll } = useAnnotations();

  const openFileDialog = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          await loadImage(file);
          setMarkupModifiedState(false);
          setAutoAnnotationPerformed(false);
          clearAll();
          setMarkupFileName(null);
          
          // Предложить загрузить файл разметки
          const baseName = file.name.replace(/\.[^/.]+$/, '');
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
        } catch (error) {
          showModal('error', 'Ошибка', 'Не удалось загрузить изображение', [
            { text: 'Ок', action: closeModal }
          ]);
        }
      }
    };
    input.click();
  }, [loadImage, setMarkupModifiedState, setAutoAnnotationPerformed, clearAll, setMarkupFileName, showModal, closeModal]);

  const handleSaveMarkup = useCallback(() => {
    if (!imageState.src) {
      showModal('error', 'Ошибка', 'Сначала загрузите изображение', [
        { text: 'Ок', action: closeModal }
      ]);
      return;
    }

    try {
      const yoloData = getYOLOExport();
      const blob = new Blob([yoloData], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      
      // Генерируем имя файла на основе имени изображения
      const imageName = imageState.file?.name || 'image';
      const baseName = imageName.replace(/\.[^/.]+$/, '');
      a.download = `${baseName}.txt`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setMarkupModifiedState(false);
      setMarkupFileName(`${baseName}.txt`);
      
      showModal('info', 'Успех', 'Разметка сохранена', [
        { text: 'Ок', action: closeModal }
      ]);
    } catch (error) {
      showModal('error', 'Ошибка', 'Не удалось сохранить разметку', [
        { text: 'Ок', action: closeModal }
      ]);
    }
  }, [imageState, getYOLOExport, setMarkupModifiedState, setMarkupFileName, showModal, closeModal]);

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
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          // Проверяем соответствие имени файла разметки и изображения
          const markupBaseName = file.name.replace(/\.[^/.]+$/, '');
          const imageBaseName = imageState.file?.name?.replace(/\.[^/.]+$/, '') || '';
          
          if (markupBaseName !== imageBaseName) {
            showModal('confirm', 'Предупреждение', 
              `Имя файла разметки "${file.name}" не соответствует имени изображения "${imageState.file?.name}". Продолжить загрузку?`, [
              {
                text: 'Да',
                action: () => {
                  closeModal();
                  loadMarkupFile(file);
                }
              },
              {
                text: 'Отмена',
                action: closeModal
              }
            ]);
          } else {
            loadMarkupFile(file);
          }
        } catch (error) {
          showModal('error', 'Ошибка', 'Не удалось загрузить файл разметки', [
            { text: 'Ок', action: closeModal }
          ]);
        }
      }
    };
    input.click();
  }, [imageState, showModal, closeModal]);

  const loadMarkupFile = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      const annotations = lines.map(line => {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5) {
          const classId = parseInt(parts[0]);
          const centerX = parseFloat(parts[1]);
          const centerY = parseFloat(parts[2]);
          const width = parseFloat(parts[3]);
          const height = parseFloat(parts[4]);
          const confidence = parts.length > 5 ? parseFloat(parts[5]) : undefined;
          
          // Конвертируем из нормализованных координат YOLO в пиксели
          const imgWidth = imageState.width;
          const imgHeight = imageState.height;
          
          const pixelX = (centerX - width / 2) * imgWidth;
          const pixelY = (centerY - height / 2) * imgHeight;
          const pixelWidth = width * imgWidth;
          const pixelHeight = height * imgHeight;
          
          return {
            classId,
            x: pixelX,
            y: pixelY,
            width: pixelWidth,
            height: pixelHeight,
            confidence
          };
        }
        return null;
      }).filter(Boolean);
      
      // Загружаем аннотации
      loadAnnotations(annotations);
      setMarkupFileName(file.name);
      setMarkupModifiedState(false);
      
      showModal('info', 'Успех', `Загружено аннотаций: ${annotations.length}`, [
        { text: 'Ок', action: closeModal }
      ]);
    } catch (error) {
      showModal('error', 'Ошибка', 'Не удалось обработать файл разметки', [
        { text: 'Ок', action: closeModal }
      ]);
    }
  }, [imageState, loadAnnotations, setMarkupFileName, setMarkupModifiedState, showModal, closeModal]);

  return {
    openFileDialog,
    handleSaveMarkup,
    handleOpenMarkup
  };
};