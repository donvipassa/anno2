// Основные типы данных приложения

export interface DefectClass {
  id: number;
  name: string;
  color: string;
  hotkey: string;
}

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
  isApiClass?: boolean;
  apiColor?: string;
}

export interface Ruler {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  selected?: boolean;
}

export interface CalibrationLine {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  realLength: number; // в мм
  selected?: boolean;
}

export interface DensityPoint {
  id: string;
  x: number;
  y: number;
  density: number;
  selected?: boolean;
}

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

export interface AnnotationState {
  boundingBoxes: BoundingBox[];
  rulers: Ruler[];
  calibrationLine: CalibrationLine | null;
  densityPoints: DensityPoint[];
  selectedObjectId: string | null;
  selectedObjectType: 'bbox' | 'ruler' | 'calibration' | 'density' | null;
}

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
]

export interface ApiDetection {
  class: string;
  confidence: number;
  bbox: [number, number, number, number]; // [x_min, y_min, x_max, y_max]
  color: [number, number, number]; // [R, G, B]
}