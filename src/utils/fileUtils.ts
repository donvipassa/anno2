import { v4 as uuidv4 } from 'uuid';
import { BoundingBox } from '../types';

export const getMarkupFileName = (imageFileName: string): string => {
  const baseName = imageFileName.replace(/\.[^/.]+$/, '');
  return `${baseName}.txt`;
};

export const downloadFile = (content: string, filename: string, mimeType: string = 'text/plain') => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('Failed to read file as text'));
      }
    };
    reader.onerror = () => reject(new Error('Error reading file'));
    reader.readAsText(file);
  });
};

export const convertYOLOToPixels = (yoloData: any, imageWidth: number, imageHeight: number): BoundingBox => {
  const [classId, centerX, centerY, width, height] = yoloData.split(' ').map(Number);
  
  // Convert YOLO normalized coordinates to pixel coordinates
  const pixelCenterX = centerX * imageWidth;
  const pixelCenterY = centerY * imageHeight;
  const pixelWidth = width * imageWidth;
  const pixelHeight = height * imageHeight;
  
  // Convert center coordinates to top-left coordinates
  const x = pixelCenterX - pixelWidth / 2;
  const y = pixelCenterY - pixelHeight / 2;
  
  return {
    id: uuidv4(),
    x,
    y,
    width: pixelWidth,
    height: pixelHeight,
    classId,
    defectRecord: null,
    formattedDefectString: ''
  };
};