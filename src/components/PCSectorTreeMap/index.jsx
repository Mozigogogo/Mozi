import React, { useEffect, useRef, useState, useMemo } from 'react';
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
    const padding = 4;
    const tileRatio = 1.6;

    try {
      d3.treemap()
        .size([width, height])
        .padding(padding)
        .round(true)
        .tile(d3.treemapSquarify.ratio(tileRatio))
        (root);

      // Color logic
      const getColor = (change) => {
        if (change > 0) return 'rgba(6, 194, 112, 1)'; // Green
        if (change < 0) return 'rgba(255, 91, 91, 1)'; // Red
        return 'rgba(179, 179, 179, 1)'; // Grey
      };

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
        .style('border-radius', '6px')
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
        
          // Add basic hover effect via JS since CSS might fail
          nodes.on('mouseenter', function() {
            d3.select(this).style('opacity', 0.9).style('z-index', 10).style('transform', 'scale(1.02)');
          }).on('mouseleave', function() {
            d3.select(this).style('opacity', 1).style('z-index', 1).style('transform', 'scale(1)');
          }).on('click', (event, d) => {
            if (onItemClick) onItemClick(d.data.original);
          });

    } catch (error) {
      console.error("TreeMap Render Error:", error);
    }

  }, [list, dimensions, loading]);

  return (
    <div className={styles.container} style={{ minHeight: '600px' }}>
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

        {/* Tooltip */}
        {hoveredItem && (
          <div 
            className={styles.tooltip}
            style={{ 
              left: tooltipPos.x, 
              top: tooltipPos.y,
              transform: 'translate(-50%, -120%)' // Move above cursor
            }}
          >
            <div className={styles.tooltipHeader}>
              <span>{hoveredItem.name}</span>
              <span style={{ 
                color: hoveredItem.change > 0 ? '#00Eba3' : '#ff5b5b',
                marginLeft: '8px'
              }}>
                {(hoveredItem.change > 0 ? '+' : '') + hoveredItem.change.toFixed(2)}%
              </span>
            </div>
            <div className={styles.tooltipRow}>
              <span className={styles.label}>最新价</span>
              <span className={styles.value}>${hoveredItem.price}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PCSectorTreeMap;
