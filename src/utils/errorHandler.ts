import { ERROR_MESSAGES } from '../constants';

/**
 * Класс для обработки ошибок приложения
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly userMessage: string;

  constructor(code: keyof typeof ERROR_MESSAGES, originalError?: Error) {
    const userMessage = ERROR_MESSAGES[code];
    super(originalError?.message || userMessage);
    
    this.name = 'AppError';
    this.code = code;
    this.userMessage = userMessage;
    
    if (originalError) {
      this.stack = originalError.stack;
    }
  }
}

/**
 * Обработчик ошибок для async функций
 * @param fn - Асинхронная функция
 * @returns Обернутая функция с обработкой ошибок
 */
export const withErrorHandling = <T extends any[], R>(
  fn: (...args: T) => Promise<R>
) => {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error('Error in function:', fn.name, error);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      // Преобразуем неизвестные ошибки в AppError
      throw new AppError('API_ERROR', error as Error);
    }
  };
};

/**
 * Логирование ошибок
 * @param error - Ошибка для логирования
 * @param context - Контекст ошибки
 */
export const logError = (error: Error, context?: string): void => {
  const timestamp = new Date().toISOString();
  const contextInfo = context ? ` [${context}]` : '';
  
  console.error(`${timestamp}${contextInfo}:`, {
    name: error.name,
    message: error.message,
    stack: error.stack,
  });
  
  // В продакшене здесь можно добавить отправку ошибок в сервис мониторинга
  if (process.env.NODE_ENV === 'production') {
    // Отправка в сервис мониторинга (например, Sentry)
  }
};