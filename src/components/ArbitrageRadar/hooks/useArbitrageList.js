'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchCryptoArbFundingList,
  fetchCryptoArbSpreadList,
  fetchCryptoArbBasisList,
  fetchCryptoArbOIList,
} from '@/api/cryptoArb';
import {
  mapSpreadItem,
  mapBasisItem,
  mapOIItem,
} from '../arbitrageTabs';
import { mapFundingItem } from '../utils/mapFundingItem';
import { buildListQuery } from '../utils/listQueries';
import { nextSortState } from '../utils/listHelpers';
import { LIST_PAGE_SIZE } from '../utils/constants';

const LOADERS = {
  funding: fetchCryptoArbFundingList,
  spread: fetchCryptoArbSpreadList,
  basis: fetchCryptoArbBasisList,
  oi: fetchCryptoArbOIList,
};

const MAPPERS = {
  funding: mapFundingItem,
  spread: mapSpreadItem,
  basis: mapBasisItem,
  oi: mapOIItem,
};

/**
 * @param {string} initialTab
 */
export function useArbitrageList(initialTab = 'funding') {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [ops, setOps] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState(null);
  const [listPage, setListPageState] = useState(1);
  const [listTotal, setListTotal] = useState(0);
  const [sortState, setSortState] = useState({ key: null, dir: 'desc' });
  const [dataDelaySec, setDataDelaySec] = useState(0);
  const listRequestId = useRef(0);

  const loadList = useCallback(
    async ({ tab = activeTab, sort = sortState, showSkeleton } = {}) => {
      const reqId = ++listRequestId.current;
      const shouldShowSkeleton = showSkeleton != null ? !!showSkeleton : ops.length === 0;
      if (shouldShowSkeleton) setListLoading(true);
      setListError(null);

      try {
        const result = await LOADERS[tab](buildListQuery(tab, sort));
        if (reqId !== listRequestId.current) return;
        const mapped = (result.list || [])
          .map((item, i) => MAPPERS[tab](item, i))
          .filter(Boolean);
        setOps(mapped);
        setListTotal(Number(result.total) || mapped.length);
        if (Number.isFinite(result.dataDelaySec) && result.dataDelaySec >= 0) {
          setDataDelaySec(Math.max(0, Math.round(result.dataDelaySec)));
        }
      } catch (err) {
        if (reqId !== listRequestId.current) return;
        setListError(err?.message || String(err));
        setOps([]);
        setListTotal(0);
        setListPageState(1);
      } finally {
        if (reqId === listRequestId.current) setListLoading(false);
      }
    },
    [activeTab, sortState, ops.length],
  );

  useEffect(() => {
    loadList({ tab: activeTab, sort: sortState, showSkeleton: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const setTab = useCallback((tab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setSortState({ key: null, dir: 'desc' });
    setListPageState(1);
    setOps([]);
    setListError(null);
  }, [activeTab]);

  const sortBy = useCallback(
    (key) => {
      const next = nextSortState(activeTab, sortState, key);
      if (!next) return;
      setSortState(next);
      setListPageState(1);
      listRequestId.current += 1;
      setListLoading(true);
      loadList({ tab: activeTab, sort: next, showSkeleton: false });
    },
    [activeTab, sortState, loadList],
  );

  const setListPage = useCallback((page) => {
    setListPageState((prev) => {
      const max = Math.max(1, Math.ceil((ops.length || 0) / LIST_PAGE_SIZE));
      return Math.max(1, Math.min(max, Number(page) || 1));
    });
  }, [ops.length]);

  const retryList = useCallback(() => {
    loadList({ tab: activeTab, sort: sortState, showSkeleton: ops.length === 0 });
  }, [activeTab, sortState, loadList, ops.length]);

  return {
    activeTab,
    ops,
    listLoading,
    listError,
    listPage,
    listTotal,
    sortState,
    dataDelaySec,
    setTab,
    sortBy,
    setListPage,
    retryList,
    loadList,
  };
}
