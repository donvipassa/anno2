import { useCallback } from 'react';
import { useAnnotations } from '../core/AnnotationManager';
import { useCalibration } from '../core/CalibrationManager';
import { MODAL_TYPES } from '../utils/constants';

export const useCalibrationHandlers = (
  showModal: (type: string, title: string, message: string, buttons?: any[]) => void,
  closeModal: () => void,
  calibrationInputValue: string,
  setCalibrationInputValue: (value: string) => void,
  setActiveTool: (tool: string) => void
) => {
  const { annotations, setCalibrationLine, updateCalibrationLine } = useAnnotations();
  const { setScale: setCalibrationScale } = useCalibration();

  const handleEditCalibration = useCallback(() => {
    if (annotations.calibrationLine) {
      const currentValue = annotations.calibrationLine.realLength.toString();
      
      showModal(MODAL_TYPES.CALIBRATION, 'Калибровка масштаба', 'Укажите реальный размер эталона для установки масштаба (мм):',
        [
          { 
            text: 'Отмена', 
            action: closeModal
          },
          { 
            text: 'Применить', 
            action: () => {
              const inputElement = document.querySelector('input[type="number"]') as HTMLInputElement;
              const inputValue = inputElement ? inputElement.value : calibrationInputValue;
              
              const realLength = parseFloat(inputValue);
              if (isNaN(realLength) || realLength <= 0) {
                alert('Пожалуйста, введите корректное положительное число');
                return;
              }
              
              try {
                const lineToCalculateFrom = annotations.calibrationLine;
                
                if (!lineToCalculateFrom) {
                  alert('Ошибка: нет данных линии для расчета');
                  closeModal();
                  return;
                }
                
                const pixelLength = Math.sqrt(
                  (lineToCalculateFrom.x2 - lineToCalculateFrom.x1) ** 2 + 
                  (lineToCalculateFrom.y2 - lineToCalculateFrom.y1) ** 2
                );
                
                updateCalibrationLine({ realLength: realLength });
                setCalibrationScale(pixelLength, realLength);
                setActiveTool('');
                closeModal();
              } catch (error) {
                console.error('Ошибка при установке калибровки:', error);
                closeModal();
                alert('Произошла ошибка при установке калибровки');
              }
            },
            primary: true
          }
        ]
      );
      
      setTimeout(() => {
        setCalibrationInputValue(currentValue);
      }, 100);
    }
  }, [annotations.calibrationLine, showModal, closeModal, updateCalibrationLine, setCalibrationScale, setActiveTool, calibrationInputValue, setCalibrationInputValue]);

  const handleCalibrationLineFinished = useCallback((lineData: any, isNew: boolean) => {
    let defaultLength = '50';
    if (!isNew && annotations.calibrationLine) {
      defaultLength = annotations.calibrationLine.realLength.toString();
    } else if (lineData?.realLength) {
      defaultLength = lineData.realLength.toString();
    }
    
    setCalibrationInputValue(defaultLength);
    showModal(MODAL_TYPES.CALIBRATION, 'Калибровка масштаба', 'Укажите реальный размер эталона для установки масштаба (мм):',
      [
        { 
          text: 'Отмена', 
          action: () => {
            setCalibrationInputValue('50');
            closeModal();
          }
        },
        { 
          text: 'Применить', 
          action: () => {
            const inputElement = document.querySelector('input[type="number"]') as HTMLInputElement;
            const inputValue = inputElement ? inputElement.value : calibrationInputValue;
            
            const realLength = parseFloat(inputValue);
            if (isNaN(realLength) || realLength <= 0) {
              alert('Пожалуйста, введите корректное положительное число');
              return;
            }
            
            try {
              let lineToCalculateFrom;
              if (isNew) {
                lineToCalculateFrom = lineData;
              } else {
                lineToCalculateFrom = annotations.calibrationLine;
              }
              
              if (!lineToCalculateFrom) {
                alert('Ошибка: нет данных линии для расчета. Попробуйте нарисовать линию заново.');
                closeModal();
                return;
              }
              
              const pixelLength = Math.sqrt(
                (lineToCalculateFrom.x2 - lineToCalculateFrom.x1) ** 2 + 
                (lineToCalculateFrom.y2 - lineToCalculateFrom.y1) ** 2
              );
              
              if (isNew) {
                setCalibrationLine({
                  ...lineData,
                  realLength: realLength
                });
              } else if (!isNew && annotations.calibrationLine) {
                updateCalibrationLine({
                  realLength: realLength
                });
              }
              
              closeModal();
              setActiveTool(''); // Сбрасываем инструмент калибровки после установки масштаба
              setActiveTool(''); // Сбрасываем инструмент калибровки после установки масштаба
            } catch (error) {
              console.error('Ошибка при установке калибровки:', error);
              closeModal();
              alert('Произошла ошибка при установке калибровки');
            }
          },
          primary: true
        }
      ]
    );
    
    setTimeout(() => {
      setCalibrationInputValue(defaultLength);
    }, 100);
  }, [annotations.calibrationLine, setCalibrationLine, updateCalibrationLine, setCalibrationScale, showModal, closeModal, calibrationInputValue, setCalibrationInputValue]);

  return {
    handleEditCalibration,
    handleCalibrationLineFinished
  };
};