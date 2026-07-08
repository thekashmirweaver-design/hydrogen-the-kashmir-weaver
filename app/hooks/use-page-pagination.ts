import {useCallback, useEffect, useRef, useState} from 'react';
import {useFetcher} from 'react-router';
import type {Product} from '~/models/types';
import type {CatalogPageInfo, ProductListScope} from '~/lib/catalog-pagination';

type CatalogProductsResponse = {
  products: Product[];
  pageInfo: CatalogPageInfo;
};

export function usePagePagination({
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
  const [currentPage, setCurrentPage] = useState(1);
  const [products, setProducts] = useState(initialProducts);
  const [pageInfo, setPageInfo] = useState(initialPageInfo);
  const [loading, setLoading] = useState(false);
  const fetcher = useFetcher<CatalogProductsResponse>();
  const cacheRef = useRef<Map<number, {products: Product[]; pageInfo: CatalogPageInfo}>>(new Map());
  const pendingPageRef = useRef<number | null>(null);

  useEffect(() => {
    cacheRef.current = new Map();
    cacheRef.current.set(1, {products: initialProducts, pageInfo: initialPageInfo});
    setCurrentPage(1);
    setProducts(initialProducts);
    setPageInfo(initialPageInfo);
  }, [initialProducts, initialPageInfo]);

  useEffect(() => {
    if (!fetcher.data?.products) return;
    const page = pendingPageRef.current;
    if (!page) return;

    const entry = {products: fetcher.data.products, pageInfo: fetcher.data.pageInfo};
    cacheRef.current.set(page, entry);
    pendingPageRef.current = null;
    setCurrentPage(page);
    setProducts(fetcher.data.products);
    setPageInfo(fetcher.data.pageInfo);
    setLoading(false);
  }, [fetcher.data]);

  const goToPage = useCallback((page: number) => {
    if (!enabled || loading || fetcher.state !== 'idle') return;
    if (page < 1) return;

    const cached = cacheRef.current.get(page);
    if (cached) {
      setCurrentPage(page);
      setProducts(cached.products);
      setPageInfo(cached.pageInfo);
      return;
    }

    const prevEntry = cacheRef.current.get(page - 1);
    if (!prevEntry?.pageInfo.hasNextPage) return;

    setLoading(true);
    pendingPageRef.current = page;

    const params = new URLSearchParams({scope: listSource.scope});
    if (prevEntry.pageInfo.endCursor) {
      params.set('after', prevEntry.pageInfo.endCursor);
    }
    if (listSource.scope === 'collection') {
      params.set('handle', listSource.handle);
    }
    fetcher.load(`/api/catalog-products?${params.toString()}`);
  }, [enabled, loading, fetcher, listSource]);

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
