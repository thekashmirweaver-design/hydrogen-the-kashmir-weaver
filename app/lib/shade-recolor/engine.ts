/** Canvas recolor engine — ported from Desktop/test/app.js */

export type RecolorAssets = {
  grayscale: HTMLImageElement;
  mask: HTMLImageElement;
  original: HTMLImageElement;
  grayPixelData: ImageData;
  maskAlphaData: ImageData;
  width: number;
  height: number;
};

function cleanMaskAlpha(luminance: number): number {
  if (luminance < 48) return 0;
  if (luminance >= 220) return 255;
  return Math.round(((luminance - 48) / (220 - 48)) * 255);
}

function parseHex(hex: string): {r: number; g: number; b: number} {
  const value = hex.replace('#', '');
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.src = src;
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
  });
}

export async function loadRecolorAssets(paths: {
  grayscale: string;
  mask: string;
  original: string;
}): Promise<RecolorAssets> {
  const [grayscale, mask, original] = await Promise.all([
    loadImage(paths.grayscale),
    loadImage(paths.mask),
    loadImage(paths.original),
  ]);

  const width = grayscale.width;
  const height = grayscale.height;

  const hiddenCanvas = document.createElement('canvas');
  hiddenCanvas.width = width;
  hiddenCanvas.height = height;
  const hiddenCtx = hiddenCanvas.getContext('2d')!;
  hiddenCtx.drawImage(grayscale, 0, 0);
  const grayPixelData = hiddenCtx.getImageData(0, 0, width, height);

  const maskAlphaCanvas = document.createElement('canvas');
  maskAlphaCanvas.width = width;
  maskAlphaCanvas.height = height;
  const maskAlphaCtx = maskAlphaCanvas.getContext('2d')!;
  maskAlphaCtx.drawImage(mask, 0, 0, width, height);
  const maskImageData = maskAlphaCtx.getImageData(0, 0, width, height);
  const maskPixels = maskImageData.data;

  for (let i = 0; i < maskPixels.length; i += 4) {
    const luminance = maskPixels[i];
    const alpha = cleanMaskAlpha(luminance);
    maskPixels[i] = 255;
    maskPixels[i + 1] = 255;
    maskPixels[i + 2] = 255;
    maskPixels[i + 3] = alpha;
  }

  maskAlphaCtx.putImageData(maskImageData, 0, 0);
  const maskAlphaData = maskImageData;

  return {
    grayscale,
    mask,
    original,
    grayPixelData,
    maskAlphaData,
    width,
    height,
  };
}

export function paintColoredProduct(
  assets: RecolorAssets,
  color: string,
): ImageData {
  const {r: tr, g: tg, b: tb} = parseHex(color);
  const output = new ImageData(assets.width, assets.height);

  const gray = assets.grayPixelData.data;
  const mask = assets.maskAlphaData.data;
  const out = output.data;

  const targetLum = (0.2126 * tr + 0.7152 * tg + 0.0722 * tb) / 255;

  for (let i = 0; i < out.length; i += 4) {
    const alpha = mask[i + 3];
    if (alpha === 0) continue;

    const lum = gray[i] / 255;
    let shade = Math.pow(lum, 0.85);

    if (targetLum > 0.75) {
      shade = 0.35 + shade * 0.65;
    }

    out[i] = Math.min(255, tr * shade);
    out[i + 1] = Math.min(255, tg * shade);
    out[i + 2] = Math.min(255, tb * shade);
    out[i + 3] = alpha;
  }

  return output;
}

export function renderRecolorPreview(
  ctx: CanvasRenderingContext2D,
  assets: RecolorAssets,
  options: {hex?: string | null; productOnly?: boolean},
): void {
  const {hex, productOnly = true} = options;
  const {width, height} = assets;

  ctx.canvas.width = width;
  ctx.canvas.height = height;
  ctx.globalCompositeOperation = 'source-over';
  ctx.filter = 'none';

  if (!hex) {
    ctx.drawImage(assets.original, 0, 0, width, height);
    return;
  }

  if (productOnly) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  } else {
    ctx.drawImage(assets.original, 0, 0, width, height);
  }

  const colored = paintColoredProduct(assets, hex);
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d')!;
  tempCtx.putImageData(colored, 0, 0);
  ctx.drawImage(tempCanvas, 0, 0);
}

export function renderRecolorPreviewCanvas(
  assets: RecolorAssets,
  options: {hex?: string | null; productOnly?: boolean},
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = assets.width;
  canvas.height = assets.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  renderRecolorPreview(ctx, assets, options);
  return canvas;
}

/** Draw source into destination using object-cover scaling. */
export function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  destWidth: number,
  destHeight: number,
): void {
  const scale = Math.max(destWidth / sourceWidth, destHeight / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  const x = (destWidth - width) / 2;
  const y = (destHeight - height) / 2;
  ctx.clearRect(0, 0, destWidth, destHeight);
  ctx.drawImage(source, x, y, width, height);
}
