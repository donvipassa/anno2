/**
 * Типы для работы с API автоматической детекции дефектов
 */

/**
 * Обнаруженный объект от API
 */
export interface ApiDetection {
  id: number;
  class: string;
  confidence: number;
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
  color: [number, number, number]; // RGB
}

/**
 * Ответ от API детекции
 */
export interface ApiResponse {
  detections: ApiDetection[];
  processing_time?: number;
  model_version?: string;
}

/**
 * Ошибка API
 */
export interface ApiError {
  error: string;
  message: string;
  status: number;
}