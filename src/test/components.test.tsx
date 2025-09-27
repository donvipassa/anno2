import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Header } from '../ui/Header';
import { StatusBar } from '../ui/StatusBar';
import { ImageProvider } from '../core/ImageProvider';
import { AnnotationProvider } from '../core/AnnotationManager';

// Мок для провайдеров
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ImageProvider>
    <AnnotationProvider>
      {children}
    </AnnotationProvider>
  </ImageProvider>
);

describe('UI Components', () => {
  it('should render Header with correct title', () => {
    render(<Header />);
    expect(screen.getByText(/Разметка дефектов сварных соединений/)).toBeInTheDocument();
  });

  it('should render StatusBar with default values', () => {
    render(
      <TestWrapper>
        <StatusBar markupFileName={null} />
      </TestWrapper>
    );
    
    expect(screen.getByText(/Изображение: –/)).toBeInTheDocument();
    expect(screen.getByText(/Разметка: –/)).toBeInTheDocument();
  });

  it('should render StatusBar with filename', () => {
    render(
      <TestWrapper>
        <StatusBar markupFileName="test.jpg.txt" />
      </TestWrapper>
    );
    
    expect(screen.getByText(/Разметка: test.jpg.txt/)).toBeInTheDocument();
  });
});