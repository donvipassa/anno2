import { ApiDetection, ApiResponse } from '../types/api';
import { APP_CONFIG, ERROR_MESSAGES } from '../config';

/**
 * Сервис для работы с API автоматической детекции дефектов
 */
class ApiService {
  private readonly apiUrl: string;

  constructor(apiUrl: string = APP_CONFIG.API_URL) {
    this.apiUrl = apiUrl;
  }

  /**
   * Отправляет изображение на сервер для автоматической детекции дефектов
   * @param imageFile - Файл изображения
   * @returns Promise с массивом обнаруженных дефектов
   */
  async detectObjects(imageFile: File): Promise<ApiDetection[]> {
    try {
      this.validateImageFile(imageFile);

      const formData = new FormData();
      formData.append('file', imageFile);

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`${ERROR_MESSAGES.API_ERROR}: ${response.status} ${response.statusText}`);
      }

      const data: ApiResponse = await response.json();

      if (!data.detections || !Array.isArray(data.detections)) {
        throw new Error('Неверный формат ответа от сервера');
      }

      return data.detections;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`${ERROR_MESSAGES.API_ERROR}: ${error.message}`);
      }
      throw new Error('Неизвестная ошибка при обращении к серверу');
    }
  }

  /**
   * Валидация файла изображения
   * @param file - Файл для валидации
   */
  private validateImageFile(file: File): void {
    if (file.size > APP_CONFIG.MAX_FILE_SIZE) {
      throw new Error(ERROR_MESSAGES.FILE_TOO_LARGE);
    }

    if (!APP_CONFIG.SUPPORTED_FORMATS.includes(file.type)) {
      throw new Error(ERROR_MESSAGES.INVALID_FORMAT);
    }
  }
}

// Экспортируем singleton instance
export const apiService = new ApiService();

// Экспортируем функцию для обратной совместимости
export const detectObjects = (imageFile: File) => apiService.detectObjects(imageFile);