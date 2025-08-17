import jsonData from './JSON_data.json';

export const API_CLASS_TO_DEFECT_CLASS_ID_MAP: { [key: string]: number } = {
  "crack": 0, // Трещины
  "porosity": 2, // Поры
  "inclusion": 3, // Шлаковые включения
  "lack of penetration": 1, // Непровары
  "undercut": 8, // Подрез
  "root concavity": 6, // Вогнутость корня шва
  "root convexity": 7, // Выпуклость корня шва
  "misalignment": 9, // Смещение кромок
  "tungsten inclusion": 4, // Вольфрамовые включения
  "oxide inclusion": 5, // Окисные включения
  // Все остальные классы, включая "defect" и "welding seam", будут сопоставляться с 'Другое' (ID: 10)
};

export const mapApiClassToDefectClassId = (apiClassName: string): number => {
  const normalizedClassName = apiClassName.toLowerCase().trim();
  const classId = API_CLASS_TO_DEFECT_CLASS_ID_MAP[normalizedClassName];
  
  // Если точного совпадения нет, пытаемся найти частичное совпадение
  if (classId === undefined) {
    for (const [key, value] of Object.entries(API_CLASS_TO_DEFECT_CLASS_ID_MAP)) {
      if (normalizedClassName.includes(key) || key.includes(normalizedClassName)) {
        return value;
      }
    }
    // Если ничего не найдено, возвращаем 'Другое'
    return 10;
  }
  
  return classId;
};

export const convertApiBboxToPixels = (
  apiBbox: [number, number, number, number]
): { x: number; y: number; width: number; height: number } => {
  const [x1, y1, x2, y2] = apiBbox;
  return {
    x: x1,
    y: y1,
    width: x2 - x1,
    height: y2 - y1
  };
};