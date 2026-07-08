import {useCallback, useEffect, useRef, useState} from 'react';
import {useFetcher} from 'react-router';
import type {Product} from '~/models/types';
import type {CatalogPageInfo, ProductListScope, SortKey} from '~/lib/catalog-pagination';
import {getSortConfig} from '~/lib/catalog-pagination';

type CatalogProductsResponse = {
  products: Product[];
  pageInfo: CatalogPageInfo;
};

export function usePagePagination({
  initialProducts,
  initialPageInfo,
  listSource,
  sortKey,
  enabled = true,
}: {
  initialProducts: Product[];
  initialPageInfo: CatalogPageInfo;
  listSource: ProductListScope;
  sortKey: SortKey;
  enabled?: boolean;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [products, setProducts] = useState(initialProducts);
  const [pageInfo, setPageInfo] = useState(initialPageInfo);
  const [loading, setLoading] = useState(false);
  const fetcher = useFetcher<CatalogProductsResponse>();
  const cacheRef = useRef<Map<string, Map<number, {products: Product[]; pageInfo: CatalogPageInfo}>>>(new Map());
  const pendingPageRef = useRef<number | null>(null);
  const sortKeyRef = useRef(sortKey);

  // Build sort params string for cache key
  const sortSerialized = `${sortKey}`;

  useEffect(() => {
    // Sort changed — reset cache and re-fetch page 1
    if (sortKeyRef.current !== sortKey) {
      sortKeyRef.current = sortKey;
      cacheRef.current = new Map();
      setCurrentPage(1);
      setLoading(true);
      pendingPageRef.current = 1;

      const params = new URLSearchParams({scope: listSource.scope, sort: sortKey});
      if (listSource.scope === 'collection') {
        params.set('handle', listSource.handle);
      }
      fetcher.load(`/api/catalog-products?${params.toString()}`);
      return;
    }

    // Initial data or navigation — cache page 1
    const sortCache = cacheRef.current.get(sortSerialized) ?? new Map();
    if (!sortCache.has(1)) {
      sortCache.set(1, {products: initialProducts, pageInfo: initialPageInfo});
      cacheRef.current.set(sortSerialized, sortCache);
    }
    setCurrentPage(1);
    setProducts(initialProducts);
    setPageInfo(initialPageInfo);
  }, [initialProducts, initialPageInfo, sortSerialized, sortKey, listSource, fetcher]);

  useEffect(() => {
    if (!fetcher.data?.products) return;
    const page = pendingPageRef.current;
    if (!page) return;

    const entry = {products: fetcher.data.products, pageInfo: fetcher.data.pageInfo};
    const sortCache = cacheRef.current.get(sortSerialized) ?? new Map();
    sortCache.set(page, entry);
    cacheRef.current.set(sortSerialized, sortCache);
    pendingPageRef.current = null;
    setCurrentPage(page);
    setProducts(fetcher.data.products);
    setPageInfo(fetcher.data.pageInfo);
    setLoading(false);
  }, [fetcher.data, sortSerialized]);

  const goToPage = useCallback((page: number) => {
    if (!enabled || loading || fetcher.state !== 'idle') return;
    if (page < 1) return;

    const sortCache = cacheRef.current.get(sortSerialized) ?? new Map();
    const cached = sortCache.get(page);
    if (cached) {
      setCurrentPage(page);
      setProducts(cached.products);
      setPageInfo(cached.pageInfo);
      return;
    }

    const prevEntry = sortCache.get(page - 1);
    if (!prevEntry?.pageInfo.hasNextPage) return;

    setLoading(true);
    pendingPageRef.current = page;

    const params = new URLSearchParams({scope: listSource.scope, sort: sortKey});
    if (prevEntry.pageInfo.endCursor) {
      params.set('after', prevEntry.pageInfo.endCursor);
    }
    if (listSource.scope === 'collection') {
      params.set('handle', listSource.handle);
    }
    fetcher.load(`/api/catalog-products?${params.toString()}`);
  }, [enabled, loading, fetcher, listSource, sortKey, sortSerialized]);

  const handleNextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [goToPage, currentPage]);

  const handlePrevPage = useCallback(() => {
    if (currentPage > 1) goToPage(currentPage - 1);
  }, [goToPage, currentPage]);

  return {
    products,
    currentPage,
    goToPage,
    handleNextPage,
    handlePrevPage,
    hasNextPage: pageInfo.hasNextPage,
    hasPreviousPage: currentPage > 1,
    isLoading: loading || fetcher.state !== 'idle',
  };
}
