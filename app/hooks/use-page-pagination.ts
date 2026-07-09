import {useCallback, useEffect, useRef, useState} from 'react';
import {useFetcher} from 'react-router';
import type {Product} from '~/models/types';
import type {CatalogPageInfo, CatalogFilters, ProductListScope, SortKey} from '~/lib/catalog-pagination';
import {DEFAULT_CATALOG_SORT, serializeFilters} from '~/lib/catalog-pagination';

type CatalogProductsResponse = {
  products: Product[];
  pageInfo: CatalogPageInfo;
};

export function usePagePagination({
  initialProducts,
  initialPageInfo,
  listSource,
  sortKey,
  filters = {},
  enabled = true,
}: {
  initialProducts: Product[];
  initialPageInfo: CatalogPageInfo;
  listSource: ProductListScope;
  sortKey: SortKey;
  filters?: CatalogFilters;
  enabled?: boolean;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [products, setProducts] = useState(initialProducts);
  const [pageInfo, setPageInfo] = useState(initialPageInfo);
  const [loading, setLoading] = useState(false);
  const fetcher = useFetcher<CatalogProductsResponse>();
  const cacheRef = useRef<Map<string, Map<number, {products: Product[]; pageInfo: CatalogPageInfo}>>>(new Map());
  const pendingPageRef = useRef<number | null>(null);
  const pendingCacheKeyRef = useRef<string | null>(null);
  const sortKeyRef = useRef(sortKey);
  const filtersRef = useRef(serializeFilters(filters));
  const prevFetcherStateRef = useRef(fetcher.state);
  const listSourceKey =
    listSource.scope === 'collection'
      ? `collection:${listSource.handle}`
      : listSource.scope;

  const currentCacheKey = `${sortKey}|${serializeFilters(filters)}`;

  // Seed page 1 from the route loader when the catalog scope changes.
  useEffect(() => {
    cacheRef.current = new Map();
    sortKeyRef.current = DEFAULT_CATALOG_SORT;
    filtersRef.current = serializeFilters({});
    pendingPageRef.current = null;
    pendingCacheKeyRef.current = null;
    prevFetcherStateRef.current = 'idle';

    const cacheKey = `${DEFAULT_CATALOG_SORT}|__none__`;
    const pageCache = new Map<number, {products: Product[]; pageInfo: CatalogPageInfo}>();
    pageCache.set(1, {products: initialProducts, pageInfo: initialPageInfo});
    cacheRef.current.set(cacheKey, pageCache);

    setCurrentPage(1);
    setProducts(initialProducts);
    setPageInfo(initialPageInfo);
    setLoading(false);
  }, [listSourceKey, initialProducts, initialPageInfo]);

  // Re-fetch when sort or filters change
  useEffect(() => {
    if (!enabled) return;
    const sortChanged = sortKeyRef.current !== sortKey;
    const filtersChanged = filtersRef.current !== serializeFilters(filters);
    if (!sortChanged && !filtersChanged) return;

    sortKeyRef.current = sortKey;
    filtersRef.current = serializeFilters(filters);

    const cached = cacheRef.current.get(currentCacheKey)?.get(1);
    if (cached) {
      setCurrentPage(1);
      setProducts(cached.products);
      setPageInfo(cached.pageInfo);
      return;
    }

    setCurrentPage(1);
    setLoading(true);
    pendingPageRef.current = 1;
    pendingCacheKeyRef.current = currentCacheKey;

    const params = new URLSearchParams({scope: listSource.scope, sort: sortKey});
    if (filters.priceMin !== undefined) params.set('priceMin', String(filters.priceMin));
    if (filters.priceMax !== undefined) params.set('priceMax', String(filters.priceMax));
    for (const handle of filters.collections ?? []) {
      params.append('collection', handle);
    }
    if (listSource.scope === 'collection') {
      params.set('handle', listSource.handle);
    }
    void fetcher.load(`/api/catalog-products?${params.toString()}`);
  }, [enabled, sortKey, filters, listSource, fetcher.load, currentCacheKey]);

  // Handle fetcher response
  useEffect(() => {
    const wasLoading = prevFetcherStateRef.current === 'loading';
    prevFetcherStateRef.current = fetcher.state;

    if (!fetcher.data?.products) return;
    if (fetcher.state !== 'idle' || !wasLoading) return;

    const page = pendingPageRef.current;
    const cacheKey = pendingCacheKeyRef.current;
    if (!page || !cacheKey) return;

    const entry = {products: fetcher.data.products, pageInfo: fetcher.data.pageInfo};
    const pageCache = cacheRef.current.get(cacheKey) ?? new Map();
    pageCache.set(page, entry);
    cacheRef.current.set(cacheKey, pageCache);
    pendingPageRef.current = null;
    pendingCacheKeyRef.current = null;
    setCurrentPage(page);
    setProducts(fetcher.data.products);
    setPageInfo(fetcher.data.pageInfo);
    setLoading(false);
  }, [fetcher.data, fetcher.state]);

  const goToPage = useCallback((page: number) => {
    if (!enabled || loading || fetcher.state !== 'idle') return;
    if (page < 1) return;

    const pageCache = cacheRef.current.get(currentCacheKey) ?? new Map();
    const cached = pageCache.get(page);
    if (cached) {
      setCurrentPage(page);
      setProducts(cached.products);
      setPageInfo(cached.pageInfo);
      return;
    }

    const prevEntry = pageCache.get(page - 1);
    if (!prevEntry?.pageInfo.hasNextPage) return;

    setLoading(true);
    pendingPageRef.current = page;
    pendingCacheKeyRef.current = currentCacheKey;

    const params = new URLSearchParams({scope: listSource.scope, sort: sortKey});
    if (filters.priceMin !== undefined) params.set('priceMin', String(filters.priceMin));
    if (filters.priceMax !== undefined) params.set('priceMax', String(filters.priceMax));
    for (const handle of filters.collections ?? []) {
      params.append('collection', handle);
    }
    if (prevEntry.pageInfo.endCursor) {
      params.set('after', prevEntry.pageInfo.endCursor);
    }
    if (listSource.scope === 'collection') {
      params.set('handle', listSource.handle);
    }
    void fetcher.load(`/api/catalog-products?${params.toString()}`);
  }, [enabled, loading, fetcher, listSource, sortKey, filters, currentCacheKey]);

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
