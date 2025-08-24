import { DefectRecord, DefectsData } from '../types/defects';

// Утилита для формирования условной записи дефекта
export const formatDefectRecord = (
  records: DefectRecord[],
  defectsData: DefectsData,
  useLatinAlphabet: boolean = false
): string => {
  if (!records.length) return '';

  const formattedRecords: string[] = [];
  let totalLength = 0;

  records.forEach(record => {
    const defect = defectsData.defects.find(d => d.id === record.defectId);
    if (!defect) return;

    // Находим соответствующий характер с учетом разновидности
    let character = defect.характер_дефекта.find(c => c.id === record.characterId);
    
    // Если есть разновидность, ищем точное совпадение
    if (record.variety && record.variety !== '-') {
      const specificCharacter = defect.характер_дефекта.find(c => 
        c.id === record.characterId && c.разновидность_дефекта === record.variety
      );
      if (specificCharacter) {
        character = specificCharacter;
      }
    }
    
    if (!character) return;

    let recordString = '';

    // Формируем строку записи в зависимости от типа дефекта
    if (character.название_характера.includes('Цепочка')) {
      // Для цепочек: [количество][символ цепочки][длина][БАЗОВЫЙ символ дефекта][размеры элементов]
      const chainLength = record.dimensions.length || 0;
      
      // Используем БАЗОВЫЙ символ дефекта (П, Ш, В), а не специальный символ характера
      const baseSymbol = useLatinAlphabet 
        ? (defectsData.symbolMapping[defect.условное_обозначение_русский] || defect.условное_обозначение_латинский)
        : defect.условное_обозначение_русский;
      
      // Символ цепочки из symbolMapping
      let chainSymbol = '';
      if (useLatinAlphabet) {
        // Ищем латинский символ в маппинге для символа цепочки
        chainSymbol = defectsData.symbolMapping[character.условное_обозначение_русский] || character.условное_обозначение_латинский;
      } else {
        chainSymbol = character.условное_обозначение_русский;
      }
      
      // Добавляем количество если больше 1
      if (record.count > 1) {
        recordString = `${record.count}${chainSymbol}${chainLength}${baseSymbol}`;
      } else {
        recordString = `${chainSymbol}${chainLength}${baseSymbol}`;
      }
      
      // Добавляем размеры элементов в цепочке
      if (character.контролируемый_размер_2.includes('диаметр') && record.dimensions.diameter) {
        recordString += record.dimensions.diameter;
      } else if (character.контролируемый_размер_2.includes('ширина') && record.dimensions.width && record.dimensions.elementLength) {
        recordString += `${record.dimensions.width}x${record.dimensions.elementLength}`;
      }
      
      // Для цепочек в суммарную длину добавляем длину цепочки × количество
      totalLength += chainLength * (record.count || 1);
    } else if (character.название_характера.includes('Скопление')) {
      // Для скоплений: [количество][символ скопления][длина][БАЗОВЫЙ символ дефекта][размеры элементов]
      const clusterLength = record.dimensions.length || 0;
      
      // Используем БАЗОВЫЙ символ дефекта (П, Ш, В), а не специальный символ характера
      const baseSymbol = useLatinAlphabet 
        ? (defectsData.symbolMapping[defect.условное_обозначение_русский] || defect.условное_обозначение_латинский)
        : defect.условное_обозначение_русский;
      
      // Символ скопления из symbolMapping
      let clusterSymbol = '';
      if (useLatinAlphabet) {
        // Ищем латинский символ в маппинге для символа скопления
        clusterSymbol = defectsData.symbolMapping[character.условное_обозначение_русский] || character.условное_обозначение_латинский;
      } else {
        clusterSymbol = character.условное_обозначение_русский;
      }
      
      // Добавляем количество если больше 1
      if (record.count > 1) {
        recordString = `${record.count}${clusterSymbol}${clusterLength}${baseSymbol}`;
      } else {
        recordString = `${clusterSymbol}${clusterLength}${baseSymbol}`;
      }
      
      // Добавляем размеры элементов в скоплении
      if (character.контролируемый_размер_2.includes('диаметр') && record.dimensions.diameter) {
        recordString += record.dimensions.diameter;
      } else if (character.контролируемый_размер_2.includes('ширина') && record.dimensions.width && record.dimensions.elementLength) {
        recordString += `${record.dimensions.width}x${record.dimensions.elementLength}`;
      }
      
      // Для скоплений в суммарную длину добавляем длину скопления × количество
      totalLength += clusterLength * (record.count || 1);
    } else {
      // Для обычных дефектов используем специальный символ характера или базовый символ дефекта
      let symbol = '';
      if (useLatinAlphabet) {
        if (character.условное_обозначение_русский !== '-') {
          // Ищем в маппинге латинский эквивалент русского символа характера
          symbol = defectsData.symbolMapping[character.условное_обозначение_русский] || character.условное_обозначение_латинский;
        } else {
          // Если русского символа характера нет, используем маппинг для базового символа дефекта
          symbol = defectsData.symbolMapping[defect.условное_обозначение_русский] || defect.условное_обозначение_латинский;
        }
      } else {
        symbol = character.условное_обозначение_русский !== '-' 
          ? character.условное_обозначение_русский 
          : defect.условное_обозначение_русский;
      }

      if (record.count > 1) {
        recordString = `${record.count}${symbol}`;
      } else {
        recordString = symbol;
      }

      // Добавляем размеры и рассчитываем суммарную длину
      if (character.контролируемый_размер_1.includes('Диаметр') && record.dimensions.diameter) {
        recordString += record.dimensions.diameter;
        // Для сферических дефектов суммарная длина = диаметр × количество
        totalLength += record.dimensions.diameter * (record.count || 1);
      } else if (character.контролируемый_размер_1.includes('Ширина') && record.dimensions.width && record.dimensions.elementLength) {
        recordString += `${record.dimensions.width}x${record.dimensions.elementLength}`;
        // Для удлиненных дефектов суммарная длина = длина × количество
        totalLength += record.dimensions.elementLength * (record.count || 1);
      } else if (character.контролируемый_размер_1.includes('Длина') && record.dimensions.length) {
        recordString += record.dimensions.length;
        // Для линейных дефектов суммарная длина = длина × количество
        totalLength += record.dimensions.length * (record.count || 1);
      }
    }

    if (recordString) {
      formattedRecords.push(recordString);
    }
  });

  // Объединяем записи точкой с запятой и добавляем суммарную длину
  let result = formattedRecords.join('; ');
  if (totalLength > 0) {
    result += `; Σ${totalLength}`;
  }

  return result;
};