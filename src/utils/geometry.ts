// Геометрические утилиты

export const calculateDistance = (
  x1: number, y1: number, 
  x2: number, y2: number
): number => {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
};

export const pointInRect = (
  px: number, py: number,
  x: number, y: number, width: number, height: number
): boolean => {
  return px >= x && px <= x + width && py >= y && py <= y + height;
};

export const normalizeCoordinates = (
  x: number, y: number, width: number, height: number,
  imageWidth: number, imageHeight: number
): { centerX: number; centerY: number; width: number; height: number } => {
  return {
    centerX: (x + width / 2) / imageWidth,
    centerY: (y + height / 2) / imageHeight,
    width: width / imageWidth,
    height: height / imageHeight
  };
};