import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { Spin } from 'antd';
import styles from './index.module.less';

const PCSectorTreeMap = ({ 
  list = [], 
  nameKey = 'symbol', 
  valueKey = 'marketCap', // Note: We will use changeKey for size as per mobile algorithm, but keep prop for compatibility
  changeKey = 'priceChangePercent',
  priceKey = 'lastPrice',
  loading = false,
  onItemClick 
}) => {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [hoveredItem, setHoveredItem] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Legend configuration
  const LEGEND_ITEMS = useMemo(() => [
    { label: '<-4%', color: '#EC3A3A', min: -Infinity, max: -4 },
    { label: '-2%', color: '#C03F44', min: -4, max: -2 },
    { label: '-1%', color: '#8A444F', min: -2, max: -1 },
    { label: '0', color: '#424450', min: -1, max: 1 },
    { label: '+1%', color: '#37544F', min: 1, max: 2 },
    { label: '+2%', color: '#37764B', min: 2, max: 4 },
    { label: '>4%', color: '#2BA250', min: 4, max: Infinity }
  ], []);

  const getColor = useCallback((change) => {
    for (let i = 0; i < LEGEND_ITEMS.length; i++) {
      const item = LEGEND_ITEMS[i];
      if (change >= item.min && change < item.max) {
        return item.color;
      }
    }
    if (change <= -4) return LEGEND_ITEMS[0].color;
    if (change >= 4) return LEGEND_ITEMS[LEGEND_ITEMS.length - 1].color;
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
      .style('height', '600px')
      .style('position', 'relative');

    const container = d3.select(containerRef.current);
    
    // Prepare data structure for D3
    const data = {
      name: 'root',
      children: list.map(item => {
        const changeVal = parseFloat(item[changeKey] || 0);
        return {
          name: item[nameKey],
          value: Math.abs(changeVal) || 0.1, 
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
        .attr('class', styles.treemapItem)
        .style('position', 'absolute')
        .style('left', d => `${d.x0}px`)
        .style('top', d => `${d.y0}px`)
        .style('width', d => `${d.x1 - d.x0}px`)
        .style('height', d => `${d.y1 - d.y0}px`)
        .style('background-color', d => getColor(d.data.change))
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

           if (area > 1500 && itemWidth > 60) {
             return `<div style="font-size:${nameFontSize}px;font-weight:600;margin-bottom:4px;">${d.data.name}</div><div style="font-size:${valFontSize}px;font-weight:700;">${changeStr}</div>`;
           } else {
             return `<div style="font-size:${Math.max(10, nameFontSize*0.8)}px;font-weight:500;">${d.data.name}</div>`;
           }
        });
        
          // Add hover effect and tooltip logic
          nodes.on('mouseenter', function(event, d) {
            d3.select(this).style('opacity', 0.9).style('z-index', 10);
            setHoveredItem({
              name: d.data.name,
              change: d.data.change,
              price: d.data.price,
              x: d.x0,
              y: d.y0,
              width: d.x1 - d.x0,
              height: d.y1 - d.y0
            });
          })
          .on('mouseleave', function() {
            d3.select(this).style('opacity', 1).style('z-index', 1);
            setHoveredItem(null);
          })
          .on('click', (event, d) => {
            if (onItemClick) onItemClick(d.data.original);
          });

    } catch (error) {
      console.error("TreeMap Render Error:", error);
    }

  }, [list, dimensions, loading, LEGEND_ITEMS, getColor]);

  const getTooltipStyle = (item) => {
    if (!item) return {};
    
    const containerWidth = dimensions.width;
    const containerHeight = dimensions.height;
    const TOOLTIP_WIDTH = 320;
    const TOOLTIP_HEIGHT = 160; // Estimated height
    
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
      top: `${top}px`
    };
  };

  return (
    <div className={styles.container} style={{ minHeight: '600px' }}>
      
      {/* Legend */}
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

      <div 
        className={styles.treemapContainer} 
        ref={containerRef}
        style={{ position: 'relative', width: '100%', height: '600px' }}
      >
        {loading && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 20,
            background: 'rgba(255,255,255,0.8)'
          }}>
            <Spin size="large" />
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
        {hoveredItem && hoveredItem.width && (
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
        {hoveredItem && (
          <div 
            className={styles.customTooltip}
            style={getTooltipStyle(hoveredItem)}
          >
            <div className={styles.tooltipHeader}>
              {hoveredItem.name}
            </div>
            <div className={styles.tooltipContent} style={{ backgroundColor: getColor(hoveredItem.change) }}>
               <div className={styles.tooltipMainRow}>
                 <span>{hoveredItem.name}</span>
                 <span>{hoveredItem.price}</span>
                 <span>{(hoveredItem.change > 0 ? '+' : '') + hoveredItem.change.toFixed(2)}%</span>
               </div>
               <div className={styles.tooltipLabelRow}>
                 <span></span>
                 <span>最新价格</span>
                 <span>24h涨跌</span>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PCSectorTreeMap;
