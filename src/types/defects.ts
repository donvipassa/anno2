// Типы для работы с данными о дефектах

export interface DefectCharacter {
  id: string;
  название_характера: string;
  условное_обозначение_русский: string;
  условное_обозначение_латинский: string;
  файл_изображение: string;
  разновидность_дефекта: string;
  контролируемый_размер_1: string;
  контролируемый_размер_2: string;
  контролируемый_размер_3?: string;
}

export interface Defect {
  id: number;
  вид_дефекта: string;
  условное_обозначение_русский: string;
  условное_обозначение_латинский: string;
  характер_дефекта: DefectCharacter[];
}

export interface DefectsData {
  defects: Defect[];
  symbolMapping: Record<string, string>;
}

export interface DefectRecord {
  id?: string; // Добавляем уникальный идентификатор для записи
  defectId: number;
  characterId: string;
  variety?: string;
  count: number;
  dimensions: {
    diameter: number;
    width: number;
    length: number;
    elementLength: number;
  };
}