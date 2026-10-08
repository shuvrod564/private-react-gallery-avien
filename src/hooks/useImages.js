import { useCallback, useEffect, useRef, useState } from 'react';
import { listImages } from '../services/imageService';
import { DEFAULT_PAGE_SIZE } from '../utils/constants';

/**
 * Gallery data hook: database-side filtering + pagination with infinite
 * scroll (spec §20, §22, §52). Re-runs whenever `filters` changes.
 */
export function useImages({ filters = {}, pageSize = DEFAULT_PAGE_SIZE, publishedOnly = true }) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [isNotConfigured, setIsNotConfigured] = useState(false);

  const pageRef = useRef(1);
  const hasMoreRef = useRef(false);
  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);

  // Stringified snapshot of the current filters for dependency tracking.
  const filterKey = JSON.stringify({ filters, publishedOnly, pageSize });

  const loadPage = useCallback(
    async (page, mode) => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;

      if (mode === 'reset') setLoading(true);
      else setLoadingMore(true);

      try {
        const result = await listImages({
          q: filters.q || '',
          category: filters.category || '',
          tag: filters.tag || '',
          author: filters.author || '',
          album: filters.album || '',
          featured: filters.featured || '',
          status: filters.status || '',
          dateFrom: filters.dateFrom || '',
          dateTo: filters.dateTo || '',
          sort: filters.sort || 'newest',
          page,
          pageSize,
          publishedOnly,
        });

        if (!mountedRef.current) return;

        setItems((prev) => (page === 1 ? result.items : [...prev, ...result.items]));
        setTotal(result.total);
        hasMoreRef.current = result.items.length > 0 && page * pageSize < result.total;
        pageRef.current = page;
        setError(null);
        setIsNotConfigured(false);
      } catch (err) {
        if (!mountedRef.current) return;
        if (err?.isNotConfigured) {
          setIsNotConfigured(true);
        } else {
          setError(err?.message || 'Something went wrong. Please try again.');
        }
      } finally {
        inFlightRef.current = false;
        if (mountedRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filterKey],
  );

  // Reset and fetch when filterKey changes
  useEffect(() => {
    mountedRef.current = true;
    setItems([]);
    hasMoreRef.current = false;
    pageRef.current = 1;
    inFlightRef.current = false;
    loadPage(1, 'reset');

    return () => {
      mountedRef.current = false;
      inFlightRef.current = true; // prevent in-flight call from updating state
    };
  }, [filterKey, loadPage]);

  const loadMore = useCallback(() => {
    if (inFlightRef.current || !hasMoreRef.current) return;
    loadPage(pageRef.current + 1, 'more');
  }, [loadPage]);

  const retry = useCallback(() => {
    loadPage(pageRef.current || 1, 'reset');
  }, [loadPage]);

  return {
    items,
    total,
    loading,
    loadingMore,
    error,
    hasMore: hasMoreRef.current,
    loadMore,
    retry,
    isNotConfigured,
  };
}
