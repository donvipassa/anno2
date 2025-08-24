// Основные типы данных приложения
export * from './api';
export * from './defects';

/**
 * Интерфейс для JSON данных классов от API
 */
export interface ApiClassData {
  apiID: number;
  name: string;
  russian_name: string;
  color: [number, number, number];
  description?: string;
}

/**
 * Класс дефекта
 */
export interface DefectClass {
  id: number;
  name: string;
  color: string;
  hotkey: string;
}

/**
 * Ограничивающая рамка
 */
export interface BoundingBox {
  id: string;
  classId: number;
  x: number;
  y: number;
  width: number;
  height: number;
  selected?: boolean;
  confidence?: number;
  apiClassName?: string;
  apiColor?: [number, number, number]; // RGB цвет от API для неизвестных классов
  apiId?: number; // ID класса от API
  defectRecord?: import('./defects').DefectRecord | null; // Для хранения структурированной записи дефекта
  formattedDefectString?: string; // Для хранения отформатированной строки записи дефекта
}

/**
 * Линейка для измерений
 */
export interface Ruler {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  selected?: boolean;
}

/**
 * Калибровочная линия
 */
export interface CalibrationLine {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  realLength: number; // в мм
  selected?: boolean;
}

/**
 * Точка измерения плотности
 */
export interface DensityPoint {
  id: string;
  x: number;
  y: number;
  selected?: boolean;
}

/**
 * Состояние изображения
 */
export interface ImageState {
  file: File | null;
  src: string | null;
  width: number;
  height: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  inverted: boolean;
  imageElement: HTMLImageElement | null;
}

/**
 * Состояние аннотаций
 */
export interface AnnotationState {
  boundingBoxes: BoundingBox[];
  rulers: Ruler[];
  calibrationLine: CalibrationLine | null;
  densityPoints: DensityPoint[];
  selectedObjectId: string | null;
  selectedObjectType: 'bbox' | 'ruler' | 'calibration' | 'density' | null;
}

/**
 * Общее состояние приложения
 */
export interface AppState {
  image: ImageState;
  annotations: AnnotationState;
  activeClassId: number;
  activeTool: string;
  scale: number; // масштаб мм/пиксель
  layerVisible: boolean;
  filterActiveClass: boolean;
  markupModified: boolean;
  markupFileName: string | null;
}

/**
 * Состояние модального окна
 */
export interface ModalState {
  type: 'info' | 'confirm' | 'error' | 'calibration' | 'help' | 'exit' | null;
  title: string;
  message: string;
  buttons?: Array<{
    text: string;
    action: () => void;
    primary?: boolean;
  }>;
  input?: {
    label: string;
    value: string;
    onChange: (value: string) => void;
  };
}

/**
 * Классы дефектов согласно ГОСТ 7512-82
 */
export const DEFECT_CLASSES: DefectClass[] = [
  { id: 0, name: 'Трещины', color: '#FF0000', hotkey: '0' },
  { id: 1, name: 'Непровары', color: '#00FF00', hotkey: '1' },
  { id: 2, name: 'Поры', color: '#0000FF', hotkey: '2' },
  { id: 3, name: 'Шлаковые включения', color: '#FFFF00', hotkey: '3' },
  { id: 4, name: 'Вольфрамовые включения', color: '#FF00FF', hotkey: '4' },
  { id: 5, name: 'Окисные включения', color: '#00FFFF', hotkey: '5' },
  { id: 6, name: 'Вогнутость корня шва', color: '#FFA500', hotkey: '6' },
  { id: 7, name: 'Выпуклость корня шва', color: '#800080', hotkey: '7' },
  { id: 8, name: 'Подрез', color: '#008000', hotkey: '8' },
  { id: 9, name: 'Смещение кромок', color: '#800000', hotkey: '9' },
  { id: 10, name: 'Другое', color: '#808080', hotkey: '-' }
];