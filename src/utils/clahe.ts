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

  const output = new ImageData(width, height);
  output.data.set(data);

  const labData = rgbToLab(data, width, height);

  const tileWidth = Math.floor(width / tileGridSize);
  const tileHeight = Math.floor(height / tileGridSize);

  const tileCDFs: number[][][] = [];

  for (let tileY = 0; tileY < tileGridSize; tileY++) {
    tileCDFs[tileY] = [];
    for (let tileX = 0; tileX < tileGridSize; tileX++) {
      const x1 = tileX * tileWidth;
      const y1 = tileY * tileHeight;
      const x2 = Math.min((tileX + 1) * tileWidth, width);
      const y2 = Math.min((tileY + 1) * tileHeight, height);

      const histogram = calculateLHistogram(labData, x1, y1, x2, y2, width);
      const clippedHistogram = clipHistogram(histogram, clipLimit, (x2 - x1) * (y2 - y1));
      tileCDFs[tileY][tileX] = calculateCDF(clippedHistogram);
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 3;
      const L = labData[idx];

      const tileX = Math.min(Math.floor(x / tileWidth), tileGridSize - 1);
      const tileY = Math.min(Math.floor(y / tileHeight), tileGridSize - 1);

      const cdf = tileCDFs[tileY][tileX];
      const newL = cdf[Math.min(255, Math.max(0, Math.round(L)))];

      labData[idx] = newL;
    }
  }

  labToRgb(labData, output.data, width, height);

  return output;
};

const rgbToLab = (data: Uint8ClampedArray, width: number, height: number): Float32Array => {
  const labData = new Float32Array(width * height * 3);

  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4] / 255;
    const g = data[i * 4 + 1] / 255;
    const b = data[i * 4 + 2] / 255;

    let rLinear = r <= 0.04045 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
    let gLinear = g <= 0.04045 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
    let bLinear = b <= 0.04045 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

    let x = rLinear * 0.4124564 + gLinear * 0.3575761 + bLinear * 0.1804375;
    let y = rLinear * 0.2126729 + gLinear * 0.7151522 + bLinear * 0.0721750;
    let z = rLinear * 0.0193339 + gLinear * 0.1191920 + bLinear * 0.9503041;

    x = x / 0.95047;
    y = y / 1.00000;
    z = z / 1.08883;

    const fx = x > 0.008856 ? Math.pow(x, 1 / 3) : (7.787 * x + 16 / 116);
    const fy = y > 0.008856 ? Math.pow(y, 1 / 3) : (7.787 * y + 16 / 116);
    const fz = z > 0.008856 ? Math.pow(z, 1 / 3) : (7.787 * z + 16 / 116);

    const L = (116 * fy - 16) * 255 / 100;
    const a = 500 * (fx - fy) + 128;
    const bLab = 200 * (fy - fz) + 128;

    labData[i * 3] = L;
    labData[i * 3 + 1] = a;
    labData[i * 3 + 2] = bLab;
  }

  return labData;
};

const labToRgb = (labData: Float32Array, rgbData: Uint8ClampedArray, width: number, height: number): void => {
  for (let i = 0; i < width * height; i++) {
    const L = labData[i * 3] * 100 / 255;
    const a = labData[i * 3 + 1] - 128;
    const bLab = labData[i * 3 + 2] - 128;

    const fy = (L + 16) / 116;
    const fx = a / 500 + fy;
    const fz = fy - bLab / 200;

    const xr = fx > 0.206897 ? fx * fx * fx : (fx - 16 / 116) / 7.787;
    const yr = fy > 0.206897 ? fy * fy * fy : (fy - 16 / 116) / 7.787;
    const zr = fz > 0.206897 ? fz * fz * fz : (fz - 16 / 116) / 7.787;

    const x = xr * 0.95047;
    const y = yr * 1.00000;
    const z = zr * 1.08883;

    let r = x * 3.2404542 + y * -1.5371385 + z * -0.4985314;
    let g = x * -0.9692660 + y * 1.8760108 + z * 0.0415560;
    let b = x * 0.0556434 + y * -0.2040259 + z * 1.0572252;

    r = r > 0.0031308 ? 1.055 * Math.pow(r, 1 / 2.4) - 0.055 : 12.92 * r;
    g = g > 0.0031308 ? 1.055 * Math.pow(g, 1 / 2.4) - 0.055 : 12.92 * g;
    b = b > 0.0031308 ? 1.055 * Math.pow(b, 1 / 2.4) - 0.055 : 12.92 * b;

    rgbData[i * 4] = Math.min(255, Math.max(0, Math.round(r * 255)));
    rgbData[i * 4 + 1] = Math.min(255, Math.max(0, Math.round(g * 255)));
    rgbData[i * 4 + 2] = Math.min(255, Math.max(0, Math.round(b * 255)));
    rgbData[i * 4 + 3] = 255;
  }
};

const calculateLHistogram = (
  labData: Float32Array,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width: number
): number[] => {
  const histogram = new Array(256).fill(0);

  for (let y = y1; y < y2; y++) {
    for (let x = x1; x < x2; x++) {
      const idx = (y * width + x) * 3;
      const L = Math.min(255, Math.max(0, Math.round(labData[idx])));
      histogram[L]++;
    }
  }

  return histogram;
};

const clipHistogram = (histogram: number[], clipLimit: number, totalPixels: number): number[] => {
  const clipped = [...histogram];
  const limit = Math.max(1, Math.floor((clipLimit * totalPixels) / 256));

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

  if (cdfMax === cdfMin) {
    for (let i = 0; i < 256; i++) {
      cdf[i] = i;
    }
    return cdf;
  }

  for (let i = 0; i < 256; i++) {
    cdf[i] = Math.round(((cdf[i] - cdfMin) / (cdfMax - cdfMin)) * 255);
  }

  return cdf;
};
