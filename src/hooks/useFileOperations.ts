import { useCallback } from 'react';
import { loadAnnotations } from '../core/AnnotationManager';
import { validateMarkupFileName, readFileAsText, validateYOLOData, convertYOLOToPixels } from '../utils/fileUtils';

interface UseFileOperationsProps {
  showModal: (type: string, title: string, message: string, buttons?: any[]) => void;
  closeModal: () => void;
  setMarkupFileName: (name: string | null) => void;
  setMarkupModifiedState: (modified: boolean) => void;
  setAutoAnnotationPerformed: (performed: boolean) => void;
}

export const useFileOperations = ({
  showModal,
  closeModal,
  setMarkupFileName,
  setMarkupModifiedState,
  setAutoAnnotationPerformed
}: UseFileOperationsProps) => {
  
  const openFileDialog = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,.txt,.json';
    input.multiple = false;
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      if (file.type.startsWith('image/')) {
        // Загрузка изображения
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          if (result) {
            // Здесь должна быть логика загрузки изображения
            console.log('Loading image:', file.name);
            setMarkupFileName(null);
            setMarkupModifiedState(false);
            setAutoAnnotationPerformed(false);
          }
        };
        reader.readAsDataURL(file);
      } else {
        // Загрузка разметки
        handleOpenMarkup(file);
      }
    };
    
    input.click();
  }, [setMarkupFileName, setMarkupModifiedState, setAutoAnnotationPerformed]);

  const handleOpenMarkup = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      if (!content) return;

      try {
        // Валидация имени файла
        const validationResult = validateMarkupFileName(file.name);
        if (!validationResult.isValid) {
          showModal('error', 'Ошибка', validationResult.error || 'Неверное имя файла', [
            { text: 'Ок', action: closeModal }
          ]);
          return;
        }

        // Чтение и валидация данных
        const textData = readFileAsText(content);
        const yoloValidation = validateYOLOData(textData);
        
        if (!yoloValidation.isValid) {
          showModal('error', 'Ошибка', yoloValidation.error || 'Неверный формат данных', [
            { text: 'Ок', action: closeModal }
          ]);
          return;
        }

        // Конвертация и загрузка данных
        const annotations = convertYOLOToPixels(yoloValidation.data!, 800, 600); // Используем размеры по умолчанию
        loadAnnotations(annotations);
        
        setMarkupFileName(file.name);
        setMarkupModifiedState(false);
        
        showModal('info', 'Успех', 'Разметка успешно загружена', [
          { text: 'Ок', action: closeModal }
        ]);
      } catch (error) {
        showModal('error', 'Ошибка', 'Не удалось загрузить разметку', [
          { text: 'Ок', action: closeModal }
        ]);
      }
    };
    reader.readAsText(file);
  }, [showModal, closeModal, setMarkupFileName, setMarkupModifiedState]);

  const handleSaveMarkup = useCallback(() => {
    // Здесь должна быть логика сохранения разметки
    console.log('Saving markup...');
    setMarkupModifiedState(false);
  }, [setMarkupModifiedState]);

  return {
    openFileDialog,
    handleSaveMarkup
  };
};