import {useEffect, useRef} from 'react';
import {
  drawFitImage,
  renderRecolorPreviewCanvas,
} from '~/lib/shade-recolor/engine';
import {useRecolorAssets} from '~/hooks/use-recolor-assets';

export function SolidRecolorCanvas({
  hex,
  imageSetId = '0',
  fit = 'cover',
  className,
  style,
  alt = 'Solid pashmina',
  onClick,
}: {
  hex?: string | null;
  imageSetId?: string;
  /** cover fills the frame (thumbnails); contain shows the full product (PDP hero). */
  fit?: 'cover' | 'contain';
  className?: string;
  style?: React.CSSProperties;
  alt?: string;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const {assets, error, imageSet} = useRecolorAssets(imageSetId, true);

  useEffect(() => {
    if (!assets || !wrapperRef.current || !canvasRef.current) return;

    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const width = wrapper.clientWidth;
      const height = wrapper.clientHeight;
      if (width === 0 || height === 0) return;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const preview = renderRecolorPreviewCanvas(assets, {
        hex,
        productOnly: imageSet.productOnly,
      });
      drawFitImage(ctx, preview, assets.width, assets.height, width, height, fit);
    };

    render();
    const observer = new ResizeObserver(render);
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [assets, hex, imageSet.productOnly, fit]);

  if (error) {
    return (
      <div
        className={className}
        style={{
          ...style,
          background: 'var(--surface)',
        }}
        role="img"
        aria-label={alt}
      />
    );
  }

  return (
    <div
      ref={wrapperRef}
      className={className}
      style={style}
      onClick={onClick}
      role="img"
      aria-label={alt}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
