import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { message } from 'antd';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { getSectionSymbols } from '@/api/market';
import { completeTask } from '@/api/user';
import { request } from '@/utils/request';
import { Interface } from '@/utils/constants';
import styles from './index.module.less';

const PCSectorTreeMap = ({ 
  list = [], 
  nameKey = 'symbol', 
  valueKey = 'marketCap', 
  changeKey = 'priceChangePercent',
  priceKey = 'lastPrice',
  loading = false,
  sizeBy = 'change', // 'change' or 'value'
  priceLabel = '最新价格',
  changeLabel = '24h涨跌',
  legendCustomItems,
  customColorMethod,
  showPercentage = true,
  showPrice = true,
  showHoverPanel = true,
  hideLegend = false,
  fillHeight = false,
  onItemClick 
}) => {
  const router = useRouter();
  const { t } = useTranslation();
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [hoveredItem, setHoveredItem] = useState(null);
  const [isTooltipHovered, setIsTooltipHovered] = useState(false);
  const [sectorCoins, setSectorCoins] = useState([]);
  const [coinsLoading, setCoinsLoading] = useState(false);
  const [coinSortField, setCoinSortField] = useState('symbol'); // 'symbol' | 'price' | 'change24h'
  const [coinSortOrder, setCoinSortOrder] = useState('asc'); // 'asc' | 'desc'
  const sectorCoinsCacheRef = useRef(new Map());
  const latestCoinsRequestIdRef = useRef(0);
  const favoriteToggleInFlightRef = useRef(false);

  const patchSectorCoins = useCallback((category, updater) => {
    setSectorCoins((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (category) {
        sectorCoinsCacheRef.current.set(category, next);
      }
      return next;
    });
  }, []);

  const handleToggleFavorite = useCallback(
    async (e, coin) => {
      e.stopPropagation();
      e.preventDefault();

      const symbol = coin?.symbol;
      if (!symbol || favoriteToggleInFlightRef.current) return;

      const category = hoveredItem?.category || hoveredItem?.name;
      const prevLiked = !!coin.isLiked;
      const nextLiked = !prevLiked;

      patchSectorCoins(category, (prev) =>
        prev.map((item) => (item.symbol === symbol ? { ...item, isLiked: nextLiked } : item))
      );

      favoriteToggleInFlightRef.current = true;
      try {
        const res = await request({
          url: nextLiked ? Interface.ADD_OWN : Interface.CANCEL_OWN,
          method: 'GET',
          data: { coin: symbol },
        });

        if (res?.data?.isLogin === false) {
          patchSectorCoins(category, (prev) =>
            prev.map((item) => (item.symbol === symbol ? { ...item, isLiked: prevLiked } : item))
          );
          message.warning(t('auth.notLoggedIn') || t('user.pleaseLogin'));
          return;
        }

        if (res?.code === 0 || res?.data) {
          message.success(nextLiked ? t('common.addSuccess') : t('common.cancelSuccess'));
          if (nextLiked) {
            try {
              const ownListRes = await request({ url: Interface.COIN_SELF, method: 'GET' });
              const ownCount = ownListRes?.data?.length ?? ownListRes?.data?.list?.length ?? 0;
              if (ownCount >= 3) {
                await completeTask('ADD_WATCHLIST');
              }
            } catch (taskErr) {
              console.error('[PCSectorTreeMap] completeTask ADD_WATCHLIST failed:', taskErr);
            }
          }
        } else {
          patchSectorCoins(category, (prev) =>
            prev.map((item) => (item.symbol === symbol ? { ...item, isLiked: prevLiked } : item))
          );
          message.error(res?.msg || res?.errorMsg || t('common.operationFailed'));
        }
      } catch (error) {
        console.error('[PCSectorTreeMap] toggle favorite failed:', error);
        patchSectorCoins(category, (prev) =>
          prev.map((item) => (item.symbol === symbol ? { ...item, isLiked: prevLiked } : item))
        );
        message.error(t('common.operationFailed'));
      } finally {
        favoriteToggleInFlightRef.current = false;
      }
    },
    [hoveredItem, patchSectorCoins, t]
  );

  const handleAddMonitor = useCallback(
    (e, coin) => {
      e.stopPropagation();
      e.preventDefault();
      const symbol = coin?.symbol;
      if (!symbol || symbol === '--') return;
      router.push(`/pc/alarm?symbol=${encodeURIComponent(symbol)}`);
    },
    [router]
  );

  const normalizeMoneyDisplay = useCallback((raw) => {
    if (raw == null || raw === '') return '--';
    const text = String(raw).trim();
    if (!text) return '--';
    return text.startsWith('$') ? text.slice(1).trim() : text;
  }, []);

  const formatChangeDisplay = useCallback((raw) => {
    if (raw == null || raw === '') return { text: '0.00%', value: 0 };
    const text = String(raw).trim();
    const n = parseFloat(text.replace(/%/g, '').replace(/,/g, ''));
    if (Number.isFinite(n)) {
      return {
        text: `${n > 0 ? '+' : ''}${n.toFixed(2)}%`,
        value: n,
      };
    }
    return {
      text: text.includes('%') ? text : `${text}%`,
      value: 0,
    };
  }, []);

  // Legend configuration
  const LEGEND_ITEMS = useMemo(() => legendCustomItems || [
    { label: '<-4%', color: '#EC3A3A', min: -Infinity, max: -4 },
    { label: '-2%', color: '#C03F44', min: -4, max: -2 },
    { label: '-1%', color: '#8A444F', min: -2, max: -1 },
    { label: '0', color: '#424450', min: -1, max: 1 },
    { label: '+1%', color: '#37544F', min: 1, max: 2 },
    { label: '+2%', color: '#37764B', min: 2, max: 4 },
    { label: '>4%', color: '#2BA250', min: 4, max: Infinity }
  ], [legendCustomItems]);

  const getColor = useCallback((change) => {
    for (let i = 0; i < LEGEND_ITEMS.length; i++) {
      const item = LEGEND_ITEMS[i];
      // Only apply min/max logic if they exist (standard legend items have them)
      if (item.min !== undefined && item.max !== undefined) {
        if (change >= item.min && change < item.max) {
          return item.color;
        }
      }
    }
    // Fallback for standard legend
    if (LEGEND_ITEMS[0].min !== undefined) {
        if (change <= LEGEND_ITEMS[0].max) return LEGEND_ITEMS[0].color;
        if (change >= LEGEND_ITEMS[LEGEND_ITEMS.length - 1].min) return LEGEND_ITEMS[LEGEND_ITEMS.length - 1].color;
    }
    return '#424450';
  }, [LEGEND_ITEMS]);

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        // Ensure non-zero dimensions
        setDimensions({ 
          width: clientWidth || 800, 
          height: clientHeight || 600 
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    // Also use ResizeObserver for more robust detection
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateDimensions);
      resizeObserver.disconnect();
    };
  }, []);

  // Combined Render & Cleanup
  useEffect(() => {
    // Cleanup previous render
    if (containerRef.current) {
      d3.select(containerRef.current).selectAll(`.${styles.treemapItem}`).remove();
    }

    if (!containerRef.current || !list || list.length === 0 || loading) return;

    // Get dimensions (fallback to default if 0)
    const { clientWidth, clientHeight } = containerRef.current;
    const width = clientWidth || 800;
    const height = clientHeight || 600;

    // Ensure container has dimensions
    d3.select(containerRef.current)
      .style('width', '100%')
      .style('height', '100%')
      .style('position', 'relative');

    const container = d3.select(containerRef.current);
    
    // Prepare data structure for D3
    const data = {
      name: 'root',
      children: list.map(item => {
        const changeVal = parseFloat(item[changeKey] || 0);
        const valueVal = parseFloat(item[valueKey] || 0);
        return {
          name: item[nameKey],
          value: sizeBy === 'value' ? valueVal : (Math.abs(changeVal) || 0.1), 
          change: changeVal,
          price: item[priceKey],
          original: item
        };
      })
    };

    const root = d3.hierarchy(data)
      .sum(d => d.value)
      .sort((a, b) => b.value - a.value);

    // Layout configuration
    const totalItems = list.length;
    const padding = 0;
    const tileRatio = 1.6;

    try {
      d3.treemap()
        .size([width, height])
        .paddingOuter(0)
        .paddingInner(0)
        .round(true)
        .tile(d3.treemapSquarify.ratio(tileRatio))
        (root);

      // Render nodes
      const nodes = container
        .selectAll(`.${styles.treemapItem}`)
        .data(root.leaves())
        .join('div')
        .attr('class', d => {
          const w = d.x1 - d.x0;
          const h = d.y1 - d.y0;
          // If height is small enough that the top label (yellow tag) would overlap content, hide content name.
          // Yellow tag is ~24px height.
          // We use 80px as threshold.
          // We only hide name if yellow tag IS shown (h > 24 && w > 30).
          const hasYellowTag = h > 24 && w > 30;
          const isCompact = h < 80;
          return `${styles.treemapItem} ${hasYellowTag && isCompact ? styles.hideNameOnHover : ''}`;
        })
        .style('position', 'absolute')
        .style('left', d => `${d.x0}px`)
        .style('top', d => `${d.y0}px`)
        .style('width', d => `${d.x1 - d.x0}px`)
        .style('height', d => `${d.y1 - d.y0}px`)
        .style('background-color', d => {
            if (customColorMethod) {
                return customColorMethod(d.data);
            }
            return getColor(d.data.change);
        })
        .style('border-radius', d => {
          // Add border radius to the four corners of the treemap
          const r = '8px';
          const isLeft = d.x0 === 0;
          const isTop = d.y0 === 0;
          const isRight = Math.abs(d.x1 - width) < 1;
          const isBottom = Math.abs(d.y1 - height) < 1;
          
          let tl = isLeft && isTop ? r : '0';
          let tr = isRight && isTop ? r : '0';
          let br = isRight && isBottom ? r : '0';
          let bl = isLeft && isBottom ? r : '0';
          
          return `${tl} ${tr} ${br} ${bl}`;
        })
        .style('border', '1px solid rgba(35, 40, 49, 1)')
        .style('color', '#fff')
        .style('overflow', 'hidden')
        .style('cursor', 'pointer')
        .style('display', 'flex')
        .style('flex-direction', 'column')
        .style('justify-content', 'center')
        .style('align-items', 'center')
        .style('text-align', 'center')
        .style('transition', 'all 0.2s ease')
        .html(d => {
           // ... (HTML generation logic same as before)
           const itemWidth = d.x1 - d.x0;
           const itemHeight = d.y1 - d.y0;
           const area = itemWidth * itemHeight;
           
           if (itemWidth < 30 || itemHeight < 20) return '';

           const changeStr = (d.data.change > 0 ? '+' : '') + d.data.change.toFixed(2) + '%';
           const nameFontSize = Math.max(12, Math.min(itemWidth / 6, itemHeight / 4, 18));
           const valFontSize = Math.max(12, Math.min(itemWidth / 5, itemHeight / 3, 20));

           // Only show both name and percentage if there is enough space.
           // Height check is crucial: need at least ~50px to stack name and percentage comfortably.
           if ((showPercentage || showPrice) && area > 1500 && itemWidth > 60 && itemHeight > 50) {
             let displayValue;
             if (showPercentage) {
               displayValue = (d.data.change > 0 ? '+' : '') + d.data.change.toFixed(2) + '%';
             } else {
               // If only showing price, use it.
               displayValue = d.data.price;
             }

             return `<div class="${styles.nameText}" style="font-size:${nameFontSize}px;font-weight:600;margin-bottom:4px;">${d.data.name}</div><div style="font-size:${valFontSize}px;font-weight:700;">${displayValue}</div>`;
           } else {
             // Priority: Show Name Only
             // If the name is very long, it might still overflow, but CSS text-overflow should handle it if set,
             // or it will wrap. Given the constraints, just showing name is safer.
             return `<div class="${styles.nameText}" style="font-size:${Math.max(10, nameFontSize*0.8)}px;font-weight:500;">${d.data.name}</div>`;
           }
        });
        
          // Add hover effect and tooltip logic
          nodes.on('mouseenter', function(event, d) {
            d3.select(this).style('opacity', 0.9).style('z-index', 10);
            if (!showHoverPanel) return;
            setHoveredItem({
              name: d.data.name,
              change: d.data.change,
              price: d.data.price,
              changeRaw: d.data.original?.priceChange24h ?? d.data.change,
              marketCap: d.data.original?.sectorMarketCap ?? d.data.price,
              totalVolume: d.data.original?.totalVolume ?? d.data.original?.volume ?? d.data.original?.volume24h,
              category: d.data.original?.category ?? d.data.name,
              x: d.x0,
              y: d.y0,
              width: d.x1 - d.x0,
              height: d.y1 - d.y0
            });
          })
          .on('mouseleave', function() {
            d3.select(this).style('opacity', 1).style('z-index', 1);
            if (!showHoverPanel || !isTooltipHovered) {
              setHoveredItem(null);
            }
          })
          .on('click', (event, d) => {
            if (onItemClick) onItemClick(d.data.original);
          });

    } catch (error) {
      console.error("TreeMap Render Error:", error);
    }

  }, [list, dimensions, loading, LEGEND_ITEMS, getColor, isTooltipHovered, showHoverPanel]);

  const getTooltipStyle = (item) => {
    if (!item) return {};
    
    const containerWidth = dimensions.width;
    const containerHeight = dimensions.height;
    const TOOLTIP_WIDTH = 540;
    const TOOLTIP_HEIGHT = 520;
    
    // Dynamic offsets based on item size
    // Ensure the tooltip overlaps the item by a consistent amount, or half the item size if it's small
    const overlapX = Math.min(30, item.width / 2); 
    const overlapY = Math.min(40, item.height / 2);
    
    // Default: Top-Right Stagger (shifted right, slightly overlapping leftwards, and shifted down)
    // left: Start at right edge of item, move left by overlapX
    let left = item.x + item.width - overlapX;
    // top: Start at top edge of item, move down by overlapY
    let top = item.y + overlapY;

    // Horizontal check
    if (left + TOOLTIP_WIDTH > containerWidth) {
      // Not enough space on the right, switch to Left Stagger
      // left: Start at left edge of item, move left by TOOLTIP_WIDTH, then move right by overlapX
      left = item.x - TOOLTIP_WIDTH + overlapX;
      if (left < 0) left = 0;
    }

    // Vertical check
    if (top + TOOLTIP_HEIGHT > containerHeight) {
      // Not enough space at the bottom, switch to Bottom Stagger (align bottom with upward shift)
      
      // top: Start at bottom edge of item, move up by TOOLTIP_HEIGHT, then move up by overlapY (so bottom overlaps)
      top = item.y + item.height - TOOLTIP_HEIGHT - overlapY;
      
      // If that pushes it off the top, just clamp to bottom edge of container
      if (top + TOOLTIP_HEIGHT > containerHeight) {
          top = containerHeight - TOOLTIP_HEIGHT - overlapY;
      }
    }
    
    // Top boundary check
    if (top < 0) top = overlapY;

    return {
      left: `${left}px`,
      top: `${top}px`,
      '--tooltip-glass-tint': getColor(item.change),
    };
  };

  const tooltipChange = hoveredItem ? formatChangeDisplay(hoveredItem.changeRaw) : null;

  const parseNumericDisplay = useCallback((val) => {
    if (val == null || val === '') return 0;
    if (typeof val === 'number' && Number.isFinite(val)) return val;
    const n = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }, []);

  const formatPriceDisplay = useCallback((val) => {
    const n = parseNumericDisplay(val);
    if (!Number.isFinite(n)) return '--';
    if (n >= 1) {
      return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return n.toFixed(6);
  }, [parseNumericDisplay]);

  const sortedSectorCoins = useMemo(() => {
    const list = Array.isArray(sectorCoins) ? sectorCoins.slice() : [];
    const dir = coinSortOrder === 'asc' ? 1 : -1;
    const cmpText = (a, b) => String(a ?? '').localeCompare(String(b ?? ''), undefined, { numeric: true, sensitivity: 'base' });
    const cmpNum = (a, b) => {
      const na = Number.isFinite(a) ? a : parseNumericDisplay(a);
      const nb = Number.isFinite(b) ? b : parseNumericDisplay(b);
      return (na - nb);
    };

    list.sort((a, b) => {
      if (coinSortField === 'symbol') return dir * cmpText(a.symbol, b.symbol);
      if (coinSortField === 'price') return dir * cmpNum(a.price, b.price);
      return dir * cmpNum(a.change24h, b.change24h);
    });
    return list;
  }, [sectorCoins, coinSortField, coinSortOrder, parseNumericDisplay]);

  const toggleCoinSort = useCallback((field) => {
    const displayOrder = coinSortField === field ? coinSortOrder : 'desc';
    const nextOrder = displayOrder === 'desc' ? 'asc' : 'desc';
    setCoinSortField(field);
    setCoinSortOrder(nextOrder);
  }, [coinSortField, coinSortOrder]);

  useEffect(() => {
    if (!showHoverPanel) return;
    const category = hoveredItem?.category;
    if (!category) {
      setSectorCoins([]);
      setCoinsLoading(false);
      return;
    }

    const cached = sectorCoinsCacheRef.current.get(category);
    if (cached) {
      setSectorCoins(cached);
      setCoinsLoading(false);
      return;
    }

    const requestId = ++latestCoinsRequestIdRef.current;
    setCoinsLoading(true);
    setSectorCoins([]);

    getSectionSymbols({
      category,
      sortField: 'price_change_24h',
      sortOrder: 'desc',
    })
      .then((result) => {
        if (requestId !== latestCoinsRequestIdRef.current) return;
        if (result?.code !== 0 || !Array.isArray(result?.data)) {
          setSectorCoins([]);
          return;
        }

        const nextCoins = result.data.slice(0, 7).map((coin) => ({
          id: coin.id || coin.symbol,
          symbol: coin.symbol || '--',
          icon: coin.logoUrl || coin.icon || coin.logo || '',
          price: coin.currentPrice,
          change24h: parseNumericDisplay(coin.priceChange24h),
          isLiked: !!coin.isSelfSelected,
        }));
        sectorCoinsCacheRef.current.set(category, nextCoins);
        setSectorCoins(nextCoins);
      })
      .catch(() => {
        if (requestId !== latestCoinsRequestIdRef.current) return;
        setSectorCoins([]);
      })
      .finally(() => {
        if (requestId !== latestCoinsRequestIdRef.current) return;
        setCoinsLoading(false);
      });
  }, [hoveredItem?.category, parseNumericDisplay, showHoverPanel]);

  const containerClassName = [
    styles.container,
    fillHeight ? styles.containerFill : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClassName} style={fillHeight ? undefined : { minHeight: '600px' }}>
      {!hideLegend && (
        <div className={styles.legendContainer}>
          {LEGEND_ITEMS.map((item, index) => (
          <div key={index} className={styles.legendItem}>
            <div
              className={styles.legendDot}
              style={{ backgroundColor: item.color }}
            />
            <span>{item.label}</span>
          </div>
        ))}
        </div>
      )}

      <div
        className={`${styles.treemapContainer} ${fillHeight ? styles.treemapContainerFill : ''}`}
        ref={containerRef}
        style={fillHeight ? undefined : { position: 'relative', width: '100%', height: '600px' }}
      >
        {loading && (
          <div className={styles.skeletonContainer}>
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className={styles.skeletonItem} />
            ))}
          </div>
        )}
        
        {!loading && list.length === 0 && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100%', 
            color: '#333',
            fontSize: '16px',
            fontWeight: 500
          }}>
            暂无数据
          </div>
        )}

        {/* Highlight Overlay */}
        {showHoverPanel && hoveredItem && hoveredItem.width && (
          <div 
            className={styles.hoverOverlay}
            style={{ 
              left: hoveredItem.x, 
              top: hoveredItem.y,
              width: hoveredItem.width,
              height: hoveredItem.height
            }}
          >
            {/* Dynamically scale tag based on item size */}
            {hoveredItem.height > 24 && hoveredItem.width > 30 && (
              <div 
                className={styles.hoverTag}
                style={{
                  fontSize: hoveredItem.height < 60 ? '10px' : '14px',
                  padding: hoveredItem.height < 60 ? '0 4px' : '2px 8px',
                  lineHeight: hoveredItem.height < 60 ? '16px' : 'normal'
                }}
              >
                <div style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  width: '100%'
                }}>
                  {hoveredItem.name}
                </div>
                {hoveredItem.height > 50 && (
                  <div className={styles.hoverTriangle} />
                )}
              </div>
            )}
          </div>
        )}

        {/* Tooltip */}
        {showHoverPanel && hoveredItem && (
          <div 
            className={styles.customTooltip}
            style={getTooltipStyle(hoveredItem)}
            onMouseEnter={() => setIsTooltipHovered(true)}
            onMouseLeave={() => {
              setIsTooltipHovered(false);
              setHoveredItem(null);
            }}
          >
            <div className={styles.tooltipContent}>
              <div className={styles.tooltipTopRow}>
                <div className={styles.tooltipSectorHeader}>
                  <span className={styles.tooltipSectorName}>{hoveredItem.name}</span>
                  <span className={`${styles.tooltipSectorChange} ${tooltipChange?.value >= 0 ? styles.positive : styles.negative}`}>
                    {tooltipChange?.text}
                  </span>
                </div>
                <div className={styles.tooltipTopActions}>
                  <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/new_sector/group.svg" alt="" />
                  <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/new_sector/share.svg" alt="" />
                </div>
              </div>
              <div className={styles.tooltipSectorStats}>
                <div className={styles.tooltipStatItem}>
                  <div className={styles.tooltipStatLabel}>{t('sectorDetail.totalValue')}</div>
                  <div className={styles.tooltipStatValue}>
                    <span className={styles.tooltipCurrency}>$</span>
                    {normalizeMoneyDisplay(hoveredItem.totalVolume)}
                  </div>
                </div>
                <div className={styles.tooltipStatItem}>
                  <div className={styles.tooltipStatLabel}>{t('sectorDetail.marketCap')}</div>
                  <div className={styles.tooltipStatValue}>
                    <span className={styles.tooltipCurrency}>$</span>
                    {normalizeMoneyDisplay(hoveredItem.marketCap)}
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.tooltipCoinSection}>
              <div className={styles.tooltipCoinHead}>
                {(() => {
                  const symbolActive = coinSortField === 'symbol';
                  const priceActive = coinSortField === 'price';
                  const changeActive = coinSortField === 'change24h';
                  const symbolOrder = symbolActive ? coinSortOrder : 'desc';
                  const priceOrder = priceActive ? coinSortOrder : 'desc';
                  const changeOrder = changeActive ? coinSortOrder : 'desc';

                  return (
                    <>
                <button
                  type="button"
                    className={`${styles.tooltipCoinHeadSort} ${symbolActive ? styles.tooltipCoinHeadSortActive : ''}`}
                  onClick={() => toggleCoinSort('symbol')}
                >
                  <span>{t('sectorDetail.sort.constituent')}</span>
                    <i className={`${styles.sortArrows} ${symbolActive ? styles.sortArrowsActive : ''} ${symbolOrder === 'asc' ? styles.sortAsc : styles.sortDesc}`} />
                </button>
                <button
                  type="button"
                    className={`${styles.tooltipCoinHeadSort} ${priceActive ? styles.tooltipCoinHeadSortActive : ''}`}
                  onClick={() => toggleCoinSort('price')}
                >
                  <span>{t('sectorDetail.sort.latestPrice')}</span>
                    <i className={`${styles.sortArrows} ${priceActive ? styles.sortArrowsActive : ''} ${priceOrder === 'asc' ? styles.sortAsc : styles.sortDesc}`} />
                </button>
                <button
                  type="button"
                    className={`${styles.tooltipCoinHeadSort} ${changeActive ? styles.tooltipCoinHeadSortActive : ''}`}
                  onClick={() => toggleCoinSort('change24h')}
                >
                  <span>{t('sectorDetail.sort.change24h')}</span>
                    <i className={`${styles.sortArrows} ${changeActive ? styles.sortArrowsActive : ''} ${changeOrder === 'asc' ? styles.sortAsc : styles.sortDesc}`} />
                </button>
                <span>{t('home.columns.addFavorites')}</span>
                <span>{t('sectorDetail.addMonitor')}</span>
                    </>
                  );
                })()}
              </div>
              {coinsLoading ? (
                <div className={styles.tooltipCoinState}>{t('common.loading')}</div>
              ) : sectorCoins.length === 0 ? (
                <div className={styles.tooltipCoinState}>{t('common.noData')}</div>
              ) : (
                <div className={styles.tooltipCoinList}>
                  {sortedSectorCoins.map((coin) => (
                    <div key={coin.id} className={styles.tooltipCoinRow}>
                      <div className={styles.tooltipCoinInfo}>
                        {coin.icon ? (
                          <img src={coin.icon} alt={coin.symbol} className={styles.tooltipCoinIcon} />
                        ) : (
                          <div className={styles.tooltipCoinIconFallback}>{coin.symbol?.charAt(0) || '?'}</div>
                        )}
                        <span className={styles.tooltipCoinSymbol}>{coin.symbol}</span>
                      </div>
                      <span className={styles.tooltipCoinPrice}>{formatPriceDisplay(coin.price)}</span>
                      <span className={`${styles.tooltipCoinPct} ${coin.change24h >= 0 ? styles.coinPctPositive : styles.coinPctNegative}`}>
                        {coin.change24h >= 0 ? '+' : ''}{coin.change24h.toFixed(2)}%
                      </span>
                      <span
                        className={styles.tooltipCoinAction}
                        role="button"
                        tabIndex={0}
                        aria-label={t('home.columns.addFavorites')}
                        onClick={(e) => handleToggleFavorite(e, coin)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleToggleFavorite(e, coin);
                          }
                        }}
                      >
                        <img
                          src={coin.isLiked ? 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/new_detail/like_actived.svg' : 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/new_detail/like_no_actived.svg'}
                          alt=""
                          className={styles.tooltipActionIcon}
                        />
                      </span>
                      <span
                        className={styles.tooltipCoinAction}
                        role="button"
                        tabIndex={0}
                        aria-label={t('sectorDetail.addMonitor')}
                        onClick={(e) => handleAddMonitor(e, coin)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleAddMonitor(e, coin);
                          }
                        }}
                      >
                        <img
                          src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/new_home/monitor-bell.svg"
                          alt=""
                          className={styles.tooltipActionIconBell}
                        />
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PCSectorTreeMap;
