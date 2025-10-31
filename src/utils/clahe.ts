export interface CLAHEOptions {
  clipLimit: number;
  tileGridSize: number;
}

export const applyCLAHE = (
  imageData: ImageData,
  options: CLAHEOptions = { clipLimit: 2.0, tileGridSize: 8 }
): ImageData => {
  const { width, height, data } = imageData;
  const { clipLimit, tileGridSize } = options;

  const tileWidth = Math.floor(width / tileGridSize);
  const tileHeight = Math.floor(height / tileGridSize);

  const output = new ImageData(width, height);
  output.data.set(data);

  for (let tileY = 0; tileY < tileGridSize; tileY++) {
    for (let tileX = 0; tileX < tileGridSize; tileX++) {
      const x1 = tileX * tileWidth;
      const y1 = tileY * tileHeight;
      const x2 = Math.min((tileX + 1) * tileWidth, width);
      const y2 = Math.min((tileY + 1) * tileHeight, height);

      const histogram = calculateHistogram(data, x1, y1, x2, y2, width);

      const clippedHistogram = clipHistogram(histogram, clipLimit, (x2 - x1) * (y2 - y1));

      const cdf = calculateCDF(clippedHistogram);

      applyEqualization(output.data, cdf, x1, y1, x2, y2, width);
    }
  }

  return output;
};

const calculateHistogram = (
  data: Uint8ClampedArray,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width: number
): number[] => {
  const histogram = new Array(256).fill(0);

  for (let y = y1; y < y2; y++) {
    for (let x = x1; x < x2; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      histogram[gray]++;
    }
  }

  return histogram;
};

const clipHistogram = (histogram: number[], clipLimit: number, totalPixels: number): number[] => {
  const clipped = [...histogram];
  const limit = Math.floor((clipLimit * totalPixels) / 256);

  let excess = 0;
  for (let i = 0; i < 256; i++) {
    if (clipped[i] > limit) {
      excess += clipped[i] - limit;
      clipped[i] = limit;
    }
  }

  const redistribution = excess / 256;
  for (let i = 0; i < 256; i++) {
    clipped[i] += redistribution;
  }

  return clipped;
};

const calculateCDF = (histogram: number[]): number[] => {
  const cdf = new Array(256);
  cdf[0] = histogram[0];

  for (let i = 1; i < 256; i++) {
    cdf[i] = cdf[i - 1] + histogram[i];
  }

  const cdfMin = cdf.find(v => v > 0) || 0;
  const cdfMax = cdf[255];

  for (let i = 0; i < 256; i++) {
    cdf[i] = Math.round(((cdf[i] - cdfMin) / (cdfMax - cdfMin)) * 255);
  }

  return cdf;
};

const applyEqualization = (
  data: Uint8ClampedArray,
  cdf: number[],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width: number
): void => {
  for (let y = y1; y < y2; y++) {
    for (let x = x1; x < x2; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

      const newGray = cdf[gray];

      data[idx] = newGray;
      data[idx + 1] = newGray;
      data[idx + 2] = newGray;
    }
  }
};
