import { ApiDetection } from '../types';

const API_URL = 'https://visio.weldmarker.ru/detect';

export const detectObjects = async (imageFile: File): Promise<ApiDetection[]> => {
  try {
    const formData = new FormData();
    formData.append('file', imageFile);

    const response = await fetch(API_URL, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Ошибка сервера: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.detections || !Array.isArray(data.detections)) {
      throw new Error('Неверный формат ответа от сервера');
    }

    return data.detections;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Ошибка при обращении к серверу: ${error.message}`);
    }
    throw new Error('Неизвестная ошибка при обращении к серверу');
  }
};