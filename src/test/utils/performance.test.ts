import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { debounce, throttle, memoize } from '../../utils/performance';

describe('performance', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('debounce', () => {
    it('should delay function execution', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should reset delay on subsequent calls', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      vi.advanceTimersByTime(50);

      debounced();
      vi.advanceTimersByTime(50);
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should pass arguments to debounced function', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced('arg1', 'arg2');
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should only call function once after multiple rapid calls', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      debounced();
      debounced();
      debounced();

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should use latest arguments', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced('first');
      debounced('second');
      debounced('third');

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledWith('third');
    });
  });

  describe('throttle', () => {
    it('should execute function immediately on first call', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should prevent execution within time limit', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled();
      throttled();
      throttled();

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should allow execution after time limit', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled();
      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(100);
      throttled();
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should pass arguments to throttled function', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled('arg1', 'arg2');
      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should handle multiple calls with advancing time', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled('first');
      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(50);
      throttled('second');
      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(50);
      throttled('third');
      expect(fn).toHaveBeenCalledTimes(2);
      expect(fn).toHaveBeenLastCalledWith('third');
    });
  });

  describe('memoize', () => {
    it('should return cached result for same arguments', () => {
      const fn = vi.fn((x: number) => x * 2);
      const memoized = memoize(fn);

      expect(memoized(5)).toBe(10);
      expect(memoized(5)).toBe(10);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should compute new result for different arguments', () => {
      const fn = vi.fn((x: number) => x * 2);
      const memoized = memoize(fn);

      expect(memoized(5)).toBe(10);
      expect(memoized(10)).toBe(20);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple arguments', () => {
      const fn = vi.fn((x: number, y: number) => x + y);
      const memoized = memoize(fn);

      expect(memoized(2, 3)).toBe(5);
      expect(memoized(2, 3)).toBe(5);
      expect(fn).toHaveBeenCalledTimes(1);

      expect(memoized(3, 4)).toBe(7);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should handle string arguments', () => {
      const fn = vi.fn((str: string) => str.toUpperCase());
      const memoized = memoize(fn);

      expect(memoized('hello')).toBe('HELLO');
      expect(memoized('hello')).toBe('HELLO');
      expect(fn).toHaveBeenCalledTimes(1);

      expect(memoized('world')).toBe('WORLD');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should handle complex return values', () => {
      const fn = vi.fn((x: number) => ({ value: x * 2, computed: true }));
      const memoized = memoize(fn);

      const result1 = memoized(5);
      const result2 = memoized(5);

      expect(result1).toBe(result2);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should distinguish between different argument types', () => {
      const fn = vi.fn((x: unknown) => String(x));
      const memoized = memoize(fn);

      expect(memoized(5)).toBe('5');
      expect(memoized('5')).toBe('5');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should handle no arguments', () => {
      const fn = vi.fn(() => Math.random());
      const memoized = memoize(fn);

      const result1 = memoized();
      const result2 = memoized();

      expect(result1).toBe(result2);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});
