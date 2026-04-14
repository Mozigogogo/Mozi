'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { buildSectorDetailHref } from '@/utils/sectorNavigation';
import styles from './index.module.less';

const HomeTreeMap = ({ list = [], name, desc }) => {
  const router = useRouter();
  const containerRef = useRef(null);
  const d3Ref = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const normalizeChange = useCallback((raw) => {
    if (raw == null) return { change: 0, changeStr: '--' };

    // string like "5.3%" / "-2.1"
    if (typeof raw === 'string') {
      const n = parseFloat(raw.replace('%', ''));
      if (!Number.isFinite(n)) return { change: 0, changeStr: '--' };
      const hasPercent = raw.includes('%');
      return { change: n, changeStr: hasPercent ? raw : `${n}%` };
    }

    // number: prefer treating small decimals as ratio (0.05321 => 5.321%)
    if (typeof raw === 'number') {
      if (!Number.isFinite(raw)) return { change: 0, changeStr: '--' };
      const n = Math.abs(raw) <= 1 ? raw * 100 : raw;
      const rounded = Number.isFinite(n) ? n.toFixed(2) : '0.00';
      return { change: n, changeStr: `${rounded}%` };
    }

    const fallback = parseFloat(String(raw).replace('%', ''));
    if (!Number.isFinite(fallback)) return { change: 0, changeStr: '--' };
    return { change: fallback, changeStr: `${fallback}%` };
  }, []);

  // 动态获取容器尺寸
  const updateDimensions = useCallback(() => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width || containerRef.current.clientWidth;
    const height = rect.height || containerRef.current.clientHeight || 280;
    
    setDimensions({ width, height });
  }, []);

  // 监听容器尺寸变化
  useEffect(() => {
    if (!containerRef.current) return;

    // 初始化尺寸
    updateDimensions();

    // 使用 ResizeObserver 监听容器尺寸变化
    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });

    resizeObserver.observe(containerRef.current);

    // 监听窗口大小变化（备用方案）
    window.addEventListener('resize', updateDimensions);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
  }, [updateDimensions]);

  // 渲染 TreeMap
  useEffect(() => {
    if (!list || list.length === 0 || !containerRef.current) return undefined;
    if (dimensions.width === 0 || dimensions.height === 0) return undefined;

    let cancelled = false;
    const ensureD3 = async () => {
      if (d3Ref.current) return d3Ref.current;
      // Dynamic import: avoid bundling d3 into the initial shared chunk
      const mod = await import('d3');
      d3Ref.current = mod;
      return mod;
    };

    const run = async () => {
      const d3 = await ensureD3();
      if (cancelled) return;

      // 清空容器
      const container = d3.select(containerRef.current);
      container.selectAll('*').remove();

    // 使用动态获取的容器尺寸
    const { width, height } = dimensions;

    // 准备数据结构（D3 需要层次化数据）
    const data = {
      name: 'root',
      children: list.map(item => ({
        name: item[name],
        value: Math.abs(normalizeChange(item[desc]).change),
        change: normalizeChange(item[desc]).change,
        changeStr: normalizeChange(item[desc]).changeStr,
        raw: item,
      }))
    };

      // 创建层次结构
      const root = d3.hierarchy(data).sum((d) => d.value);

    const totalItems = list.length;
    
    // 首页专用：增加间距
    const padding = totalItems >= 10 ? 2.5 : 3;
    const aspectRatio = width / height;
    
    // 针对首页容器优化的比例
    let tileRatio = 1.5;
    if (totalItems >= 10) {
      if (aspectRatio > 1.2) {
        tileRatio = 1.6;
      } else {
        tileRatio = 1.4;
      }
    }

      // 创建 treemap 布局
      const treemap = d3
        .treemap()
        .size([width, height])
        .padding(padding)
        .round(true)
        .tile(d3.treemapSquarify.ratio(tileRatio));

      // 计算布局
      treemap(root);

    // 颜色映射函数 - 首页专用：涨跌纯色
    const getColor = (change) => {
      if (change > 0) return 'rgba(6, 194, 112, 1)'; // 涨：绿色
      if (change < 0) return 'rgba(255, 91, 91, 1)'; // 跌：红色
      return 'rgba(179, 179, 179, 1)'; // 0%：灰色
    };

    // 渲染节点
      const nodes = container
        .selectAll('.treemap-node')
        .data(root.leaves())
        .join('div')
        .attr('class', styles.treemapItem)
        .style('position', 'absolute')
        .style('left', (d) => `${d.x0}px`)
        .style('top', (d) => `${d.y0}px`)
        .style('width', (d) => `${d.x1 - d.x0}px`)
        .style('height', (d) => `${d.y1 - d.y0}px`)
        .style('background-color', (d) => getColor(d.data.change))
        .style('overflow', 'hidden')
        .style('border-radius', (d) => {
          const itemWidth = d.x1 - d.x0;
          const itemHeight = d.y1 - d.y0;
          const minSize = Math.min(itemWidth, itemHeight);

          // 首页专用：更小的圆角
          if (minSize > 80) return '8px';
          if (minSize > 50) return '6px';
          if (minSize > 30) return '5px';
          if (minSize > 20) return '4px';
          return '3px';
        })
        .html((d) => {
          const itemWidth = d.x1 - d.x0;
          const itemHeight = d.y1 - d.y0;
          const area = itemWidth * itemHeight;

          // 首页专用：更低的显示阈值
          const minDisplayArea = totalItems >= 10 ? 100 : 150;
          const minWidth = totalItems >= 10 ? 10 : 12;
          const minHeight = totalItems >= 10 ? 7 : 8;

          if (area < minDisplayArea || itemWidth < minWidth || itemHeight < minHeight) {
            return '';
          }

          // 名称字号：根据块的宽度和高度计算，大块最大 15px，小块最小 10px
          const nameFontSize = Math.max(
            10,
            Math.min(itemWidth / 8, itemHeight / 4, 15)
          );

          // 数值字号：比名称稍大，大块最大 16px，小块最小 10px
          const valueFontSize = Math.max(
            10,
            Math.min(itemWidth / 6, itemHeight / 3, 16)
          );

          let content = '';

          if (area > 1200 && itemWidth > 45 && itemHeight > 28) {
            content = `
              <div style="
                font-size: ${nameFontSize}px;
                font-weight: 500;
                line-height: 1.2;
                margin-bottom: 3px;
                overflow: hidden;
                text-overflow: ellipsis;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                word-break: break-word;
              ">${d.data.name}</div>
              <div style="
                font-size: ${valueFontSize}px;
                font-weight: 700;
                font-family: Roboto, -apple-system, BlinkMacSystemFont, sans-serif;
              ">${d.data.changeStr}</div>
            `;
          } else if (area > 400 && itemWidth > 28 && itemHeight > 16) {
            content = `
              <div style="
                font-size: ${nameFontSize}px;
                font-weight: 500;
                line-height: 1.15;
                overflow: hidden;
                text-overflow: ellipsis;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                word-break: break-word;
              ">${d.data.name}</div>
            `;
          } else {
            content = `
              <div style="
                font-size: ${Math.max(10, nameFontSize * 0.9)}px;
                font-weight: 500;
                line-height: 1.1;
                overflow: hidden;
                text-overflow: ellipsis;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                word-break: break-word;
              ">${d.data.name}</div>
            `;
          }

          return `
            <div style="
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              height: 100%;
              padding: ${totalItems >= 10 ? '2px' : '3px'};
              color: #fff;
              text-align: center;
            ">
              ${content}
            </div>
          `;
        });

    // 添加悬停效果和点击事件
      nodes
        .on('mouseenter', function () {
          d3
            .select(this)
            .style('opacity', '0.9')
            .style('transform', 'scale(1.02)')
            .style('z-index', '10')
            .style('cursor', 'pointer');
        })
        .on('mouseleave', function () {
          d3
            .select(this)
            .style('opacity', '1')
            .style('transform', 'scale(1)')
            .style('z-index', '1');
        })
        .on('click', function (event, d) {
          const row =
            d.data.raw ?? {
              category: d.data.name,
              name: d.data.name,
              priceChange24h: d.data.change,
            };
          router.push(buildSectorDetailHref(row));
        });
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [list, name, desc, dimensions, router, normalizeChange]);

  if (!list || list.length === 0) {
    return (
      <div className={styles.emptyContainer}>
        <div className={styles.emptyText}>暂无数据</div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className={styles.treemapContainer}
      style={{ position: 'relative', width: '100%', height: '100%' }}
    />
  );
};

export default HomeTreeMap;
