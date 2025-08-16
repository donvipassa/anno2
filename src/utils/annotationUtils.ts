// Утилиты для работы с аннотациями от API

export const API_CLASS_TO_DEFECT_CLASS_ID_MAP: { [key: string]: number } = {
  "defect": 0, // Трещины
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
  "welding seam": 10, // Сопоставляется с 'Другое'
};

// Не используем сопоставление - все API классы рассматриваем как дополнительные
export const mapApiClassToDefectClassId = (apiClassName: string): number => {
  // Возвращаем -1 для обозначения API класса (не из стандартных классов дефектов)
  return -1;
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

export const convertApiColorToHex = (apiColor: [number, number, number]): string => {
  const [r, g, b] = apiColor;
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};