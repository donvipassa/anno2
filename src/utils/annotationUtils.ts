export const API_CLASS_TO_DEFECT_CLASS_ID_MAP: { [key: string]: number } = {
  "Defect": 0, // Сопоставляется с 'Трещины'
  "welding seam": 10, // Сопоставляется с 'Другое'
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
};

export const mapApiClassToDefectClassId = (apiClassName: string): number => {
  const classId = API_CLASS_TO_DEFECT_CLASS_ID_MAP[apiClassName.toLowerCase()];
  return classId !== undefined ? classId : 10; // По умолчанию 'Другое'
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