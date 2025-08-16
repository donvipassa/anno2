// Утилиты для работы с файлами

export const downloadFile = (content: string, filename: string): void => {
  const blob = new Blob([content], { type: 'text/plain' });
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
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

export const getMarkupFileName = (imageFileName: string): string => {
  return `${imageFileName}.txt`;
};

export const validateMarkupFileName = (markupFileName: string, imageFileName: string): boolean => {
  return markupFileName === getMarkupFileName(imageFileName);
};

export const parseYOLOData = (content: string): any[] => {
  const lines = content.trim().split('\n').filter(line => line.trim());
  
  return lines.map(line => {
    const parts = line.split(' ').filter(part => part.trim());
    if (parts.length < 5) return null;
    
    try {
      return {
        classId: parseInt(parts[0]),
        centerX: parseFloat(parts[1]),
        centerY: parseFloat(parts[2]),
        width: parseFloat(parts[3]),
        height: parseFloat(parts[4])
      };
    } catch {
      return null;
    }
  }).filter(Boolean);
};

export const convertYOLOToPixels = (
  yoloData: any,
  imageWidth: number,
  imageHeight: number
): any => {
  return {
    classId: yoloData.classId,
    x: (yoloData.centerX - yoloData.width / 2) * imageWidth,
    y: (yoloData.centerY - yoloData.height / 2) * imageHeight,
    width: yoloData.width * imageWidth,
    height: yoloData.height * imageHeight
  };
};