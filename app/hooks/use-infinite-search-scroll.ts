import {useCallback, useEffect, useRef, useState} from 'react';
import {useFetcher} from 'react-router';
import type {Product} from '~/models/types';
import type {CatalogPageInfo} from '~/lib/catalog-pagination';

type SearchProductsResponse = {
  products: Product[];
  pageInfo: CatalogPageInfo;
};

export function useInfiniteSearchScroll({
  term,
  initialProducts,
  initialPageInfo,
}: {
  term: string;
  initialProducts: Product[];
  initialPageInfo: CatalogPageInfo;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [pageInfo, setPageInfo] = useState(initialPageInfo);
  const fetcher = useFetcher<SearchProductsResponse>();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    setProducts(initialProducts);
    setPageInfo(initialPageInfo);
  }, [initialProducts, initialPageInfo, term]);

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
      !term.trim() ||
      !pageInfo.hasNextPage ||
      !pageInfo.endCursor ||
      fetcher.state !== 'idle' ||
      loadingRef.current
    ) {
      return;
    }

    loadingRef.current = true;
    const params = new URLSearchParams({
      q: term,
      after: pageInfo.endCursor,
    });
    fetcher.load(`/api/search-products?${params.toString()}`);
  }, [fetcher, pageInfo.endCursor, pageInfo.hasNextPage, term]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !pageInfo.hasNextPage || !term.trim()) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      {rootMargin: '240px'},
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore, pageInfo.hasNextPage, term]);

  return {
    products,
    sentinelRef,
    isLoadingMore: fetcher.state !== 'idle',
    hasMore: pageInfo.hasNextPage,
  };
}
