import {useCallback, useEffect, useRef, useState} from 'react';
import {useFetcher} from 'react-router';
import type {Product} from '~/models/types';
import type {CatalogPageInfo, ProductListScope} from '~/lib/catalog-pagination';

type CatalogProductsResponse = {
  products: Product[];
  pageInfo: CatalogPageInfo;
};

export function useInfiniteProductScroll({
  initialProducts,
  initialPageInfo,
  listSource,
  enabled = true,
}: {
  initialProducts: Product[];
  initialPageInfo: CatalogPageInfo;
  listSource: ProductListScope;
  enabled?: boolean;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [pageInfo, setPageInfo] = useState(initialPageInfo);
  const fetcher = useFetcher<CatalogProductsResponse>();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    setProducts(initialProducts);
    setPageInfo(initialPageInfo);
  }, [initialProducts, initialPageInfo]);

  useEffect(() => {
    if (!fetcher.data?.products) return;
    setProducts((prev) => {
      const seen = new Set(prev.map((product) => product.handle));
      const appended = fetcher.data!.products.filter(
        (product) => !seen.has(product.handle),
      );
      return appended.length ? [...prev, ...appended] : prev;
    });
    setPageInfo(fetcher.data.pageInfo);
    loadingRef.current = false;
  }, [fetcher.data]);

  const loadMore = useCallback(() => {
    if (
      !enabled ||
      !pageInfo.hasNextPage ||
      !pageInfo.endCursor ||
      fetcher.state !== 'idle' ||
      loadingRef.current
    ) {
      return;
    }

    loadingRef.current = true;
    const params = new URLSearchParams({
      scope: listSource.scope,
      after: pageInfo.endCursor,
    });
    if (listSource.scope === 'collection') {
      params.set('handle', listSource.handle);
    }
    fetcher.load(`/api/catalog-products?${params.toString()}`);
  }, [enabled, fetcher, listSource, pageInfo.endCursor, pageInfo.hasNextPage]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!enabled || !el || !pageInfo.hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      {rootMargin: '240px'},
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled, loadMore, pageInfo.hasNextPage]);

  return {
    products: enabled ? products : initialProducts,
    sentinelRef,
    isLoadingMore: enabled && fetcher.state !== 'idle',
    hasMore: enabled && pageInfo.hasNextPage,
  };
}
