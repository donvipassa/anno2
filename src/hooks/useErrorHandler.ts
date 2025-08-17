import { useCallback } from 'react';
import { AppError, logError } from '../utils/errorHandler';

/**
 * Хук для обработки ошибок в компонентах
 */
export const useErrorHandler = () => {
  const handleError = useCallback((error: Error, context?: string) => {
    logError(error, context);
    
    if (error instanceof AppError) {
      return error.userMessage;
    }
    
    return 'Произошла неизвестная ошибка';
  }, []);

  const withErrorBoundary = useCallback(<T extends any[], R>(
    fn: (...args: T) => R | Promise<R>,
    context?: string
  ) => {
    return async (...args: T): Promise<R | void> => {
      try {
        const result = await fn(...args);
        return result;
      } catch (error) {
        const errorMessage = handleError(error as Error, context);
        console.error(errorMessage);
        // Здесь можно показать уведомление пользователю
        return;
      }
    };
  }, [handleError]);

  return {
    handleError,
    withErrorBoundary,
  };
};