# Обновлённая архитектура приложения

## Структура проекта после рефакторинга

```
src/
├── components/              # React компоненты
│   ├── ui/                 # UI компоненты (кнопки, модали)
│   ├── ErrorBoundary.tsx   # Обработка ошибок
│   ├── DefectFormModal.tsx # Форма дефекта
│   ├── ContextMenuContainer.tsx  # ✨ НОВОЕ: Контекстное меню
│   └── ModalContainer.tsx        # ✨ НОВОЕ: Контейнер модалей
│
├── core/                   # Основная бизнес-логика
│   ├── AnnotationManager.tsx    # Context для аннотаций
│   ├── CalibrationManager.ts    # Управление калибровкой
│   └── ImageProvider.tsx        # Context для изображений
│
├── hooks/                  # Пользовательские хуки
│   ├── useCalibrationModal.ts
│   ├── useCanvasInteraction.ts
│   ├── useCanvasRendering.ts
│   ├── useContextMenu.ts
│   ├── useDefectFormModal.ts
│   ├── useErrorHandler.ts
│   ├── useFileOperations.ts
│   ├── useModalState.ts
│   ├── useToolManagement.ts
│   ├── useKeyboardShortcuts.ts  # ✨ НОВОЕ: Горячие клавиши
│   └── useModalDialogs.ts       # ✨ НОВОЕ: Управление диалогами
│
├── services/               # Внешние сервисы
│   ├── api.ts             # API для автоматической детекции
│   └── ModalDialogService.ts    # ✨ НОВОЕ: Фабрика диалогов
│
├── types/                  # TypeScript типы
│   ├── index.ts           # Основные типы
│   ├── api.ts             # API типы
│   ├── defects.ts         # Типы дефектов
│   ├── modalTypes.ts      # Типы модалей
│   └── canvas.ts          # ✨ НОВОЕ: Canvas типы
│
├── ui/                     # UI компоненты
│   ├── CanvasArea.tsx
│   ├── Header.tsx
│   ├── Modal.tsx
│   ├── Sidebar.tsx
│   ├── StatusBar.tsx
│   ├── Toolbar.tsx
│   └── Tooltip.tsx
│
├── utils/                  # Утилиты
│   ├── annotationUtils.ts
│   ├── canvas.ts          # ✅ УЛУЧШЕНО: Убраны any типы
│   ├── constants.ts
│   ├── errorHandler.ts
│   ├── fileUtils.ts
│   ├── formatDefectRecord.ts
│   ├── geometry.ts        # ✅ УЛУЧШЕНО: Удалено дублирование
│   ├── imageUtils.ts
│   ├── validation.ts
│   ├── coordinates.ts     # ✨ НОВОЕ: Работа с координатами
│   └── boundaries.ts      # ✨ НОВОЕ: Границы и геометрия
│
├── App.tsx                 # ✅ РЕФАКТОРЕН: 594 → 408 строк
└── main.tsx
```

## Ключевые изменения

### 1. Модульная структура App.tsx

**До:**
```typescript
const AppContent = () => {
  // 594 строки смешанной логики
  // - UI рендеринг
  // - Обработка событий
  // - Бизнес-логика
  // - Управление состоянием
  // - Горячие клавиши
  // - Модальные окна
}
```

**После:**
```typescript
const AppContent = () => {
  // 408 строк - только координация
  // Логика вынесена в:
  // - useKeyboardShortcuts
  // - useModalDialogs
  // - ContextMenuContainer
  // - ModalContainer
}
```

### 2. Типизация Canvas

**До:**
```typescript
function getResizeHandle(x: number, y: number, box: any, scale: number)
function drawBoundingBox(ctx: CanvasRenderingContext2D, box: any, ...)
```

**После:**
```typescript
type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'move';
function getResizeHandle(x: number, y: number, box: BoundingBox, scale: number): ResizeHandle | null
function drawBoundingBox(ctx: CanvasRenderingContext2D, box: BoundingBox, ...)
```

### 3. Централизованные утилиты

**Координаты (coordinates.ts):**
```typescript
canvasToImageCoords(x, y, imageState)
imageToCanvasCoords(x, y, imageState)
getImageCoordsFromEvent(event, canvas, imageState)
```

**Границы (boundaries.ts):**
```typescript
clampToImageBounds(x, y, w, h, imgW, imgH)
isPointInBounds(x, y, bounds)
isPointOnBorder(x, y, box, borderWidth)
normalizeBox(box)
calculateDistanceToLine(...)
```

**Диалоги (ModalDialogService.ts):**
```typescript
ModalDialogService.createInfoDialog(...)
ModalDialogService.createErrorDialog(...)
ModalDialogService.createConfirmDialog(...)
ModalDialogService.createUnsavedChangesDialog(...)
```

## Принципы архитектуры

### Single Responsibility Principle (SRP)
- Каждый модуль отвечает за одну вещь
- App.tsx - только координация
- useKeyboardShortcuts - только клавиши
- ModalDialogService - только создание диалогов

### Don't Repeat Yourself (DRY)
- Единая система координат
- Централизованная логика границ
- Фабрика для модальных окон

### Dependency Inversion Principle (DIP)
- Компоненты зависят от абстракций (хуков)
- Не зависят от конкретных реализаций

### Open/Closed Principle (OCP)
- Легко добавить новые горячие клавиши
- Легко добавить новые типы диалогов
- Не нужно изменять существующий код

## Граф зависимостей

```
App.tsx
  ├─→ useKeyboardShortcuts
  ├─→ useModalDialogs → ModalDialogService
  ├─→ ContextMenuContainer → utils/boundaries
  ├─→ ModalContainer
  ├─→ useCanvasInteraction → utils/coordinates
  └─→ useCanvasRendering → utils/boundaries

utils/canvas.ts → types/canvas.ts
utils/boundaries.ts → types/canvas.ts
```

## Преимущества новой архитектуры

1. **Тестируемость**: Каждый модуль можно тестировать изолированно
2. **Читаемость**: Чёткое разделение ответственности
3. **Поддерживаемость**: Легко найти и исправить код
4. **Расширяемость**: Просто добавлять новый функционал
5. **Type Safety**: Строгая типизация везде
