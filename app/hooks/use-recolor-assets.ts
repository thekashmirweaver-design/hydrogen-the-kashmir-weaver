import {useEffect, useState} from 'react';
import {
  loadRecolorAssets,
  type RecolorAssets,
} from '~/lib/shade-recolor/engine';
import {
  getSolidRecolorImageSet,
  type SolidRecolorImageSet,
} from '~/lib/solid-product';

const assetCache = new Map<string, RecolorAssets>();
const loadPromises = new Map<string, Promise<RecolorAssets>>();

function loadSetAssets(set: SolidRecolorImageSet): Promise<RecolorAssets> {
  const cached = assetCache.get(set.id);
  if (cached) return Promise.resolve(cached);

  const pending = loadPromises.get(set.id);
  if (pending) return pending;

  const promise = loadRecolorAssets({
    grayscale: set.grayscale,
    mask: set.mask,
    original: set.original,
  }).then((assets) => {
    assetCache.set(set.id, assets);
    return assets;
  });

  loadPromises.set(set.id, promise);
  return promise;
}

export function useRecolorAssets(imageSetId: string, enabled = true) {
  const set = getSolidRecolorImageSet(imageSetId);
  const [assets, setAssets] = useState<RecolorAssets | null>(
    () => assetCache.get(set.id) ?? null,
  );
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const cached = assetCache.get(set.id);
    if (cached) {
      setAssets(cached);
      setError(null);
      return;
    }

    let cancelled = false;
    loadSetAssets(set)
      .then((loaded) => {
        if (!cancelled) {
          setAssets(loaded);
          setError(null);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, set]);

  return {assets, error, imageSet: set};
}

/** Warm recolor assets for a single image set. */
export function prefetchRecolorAssets(imageSetId: string): void {
  const set = getSolidRecolorImageSet(imageSetId);
  void loadSetAssets(set);
}
