import { useState, useCallback } from 'react';

export const useFileOperations = (
  showModal: (type: string, title: string, message: string, buttons?: any[]) => void,
  closeModal: () => void,
  setMarkupFileName: (name: string | null) => void,
  setMarkupModifiedState: (modified: boolean) => void,
  setAutoAnnotationPerformed: (performed: boolean) => void,
  loadAnnotations: (data: any) => void,
  imageState: any
) => {
  const openFileDialog = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            // Handle image loading logic here
            setMarkupFileName(null);
            setMarkupModifiedState(false);
            setAutoAnnotationPerformed(false);
          };
          img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  }, [setMarkupFileName, setMarkupModifiedState, setAutoAnnotationPerformed]);

  const handleSaveMarkup = useCallback(() => {
    if (!imageState?.src) {
      showModal('error', 'Ошибка', 'Сначала загрузите изображение', [
        { text: 'Ок', action: closeModal }
      ]);
      return;
    }

    // Save markup logic here
    const input = document.createElement('input');
    input.type = 'file';
    input.webkitdirectory = false;
    input.accept = '.txt';
    
    // Create save dialog
    const link = document.createElement('a');
    const blob = new Blob(['markup data'], { type: 'text/plain' });
    link.href = URL.createObjectURL(blob);
    link.download = 'markup.txt';
    link.click();
    
    setMarkupModifiedState(false);
  }, [imageState, showModal, closeModal, setMarkupModifiedState]);

  const handleOpenMarkup = useCallback(() => {
    if (!imageState?.width || !imageState?.height) {
      showModal('error', 'Ошибка', 'Не удалось загрузить файл разметки. Сначала загрузите изображение', [
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
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const content = event.target?.result as string;
            const lines = content.trim().split('\n').filter(line => line.trim());
            
            if (lines.length > 0) {
              // Process YOLO format data
              const yoloData = lines.map(line => {
                const parts = line.trim().split(/\s+/);
                return {
                  classId: parseInt(parts[0]),
                  x: parseFloat(parts[1]),
                  y: parseFloat(parts[2]),
                  width: parseFloat(parts[3]),
                  height: parseFloat(parts[4])
                };
              });
              
              loadAnnotations(yoloData);
              setMarkupFileName(file.name);
              setMarkupModifiedState(false);
            }
          } catch (error) {
            showModal('error', 'Ошибка', 'Не удалось загрузить файл разметки', [
              { text: 'Ок', action: closeModal }
            ]);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, [imageState, showModal, closeModal, loadAnnotations, setMarkupFileName, setMarkupModifiedState]);

  return {
    openFileDialog,
    handleSaveMarkup,
    handleOpenMarkup
  };
};