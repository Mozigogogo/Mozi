'use client';

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import styles from './index.module.less';

const MoziTreeMap = ({ list = [], name, desc, onItemClick }) => {
  const containerRef = useRef(null);

  const normalizeChange = (raw) => {
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
  };

  useEffect(() => {
    if (!list || list.length === 0 || !containerRef.current) return;

    // 清空容器
    const container = d3.select(containerRef.current);
    container.selectAll('*').remove();

    // 获取容器尺寸
    const width = containerRef.current.clientWidth;
    const height = 600; // 固定高度

    // 准备数据结构（D3 需要层次化数据）
    const data = {
      name: 'root',
      children: list.map(item => ({
        name: item[name],
        value: Math.abs(normalizeChange(item[desc]).change),
        change: normalizeChange(item[desc]).change,
        changeStr: normalizeChange(item[desc]).changeStr,
        raw: item
      }))
    };

    // 创建层次结构
    const root = d3.hierarchy(data)
      .sum(d => d.value);
      // 移除自动排序，保持传入数据的顺序

    // 创建 treemap 布局（使用 Squarified 算法）
    const treemap = d3.treemap()
      .size([width, height])
      .padding(2)
      .round(true)
      .tile(d3.treemapSquarify.ratio(1)); // 黄金比例

    // 计算布局
    treemap(root);

    // 颜色映射函数
    const getColor = (change) => {
      if (change > 5.0) return 'rgba(6, 194, 112, 1)';
      if (change > 2.0) return 'rgba(6, 194, 112, 0.8)';
      if (change > 0.5) return 'rgba(6, 194, 112, 0.6)';
      if (change > 0) return 'rgba(6, 194, 112, 0.4)';
      if (change < -5.0) return 'rgba(255, 91, 91, 1)';
      if (change < -2.0) return 'rgba(255, 91, 91, 0.8)';
      if (change < -0.5) return 'rgba(255, 91, 91, 0.6)';
      if (change < 0) return 'rgba(255, 91, 91, 0.4)';
      return '#B3B3B3';
    };

    // 渲染节点
    const nodes = container
      .selectAll('.treemap-node')
      .data(root.leaves())
      .join('div')
      .attr('class', styles.treemapItem)
      .style('position', 'absolute')
      .style('left', d => `${d.x0}px`)
      .style('top', d => `${d.y0}px`)
      .style('width', d => `${d.x1 - d.x0}px`)
      .style('height', d => `${d.y1 - d.y0}px`)
      .style('background-color', d => getColor(d.data.change))
      .style('overflow', 'hidden')
      .style('border-radius', d => {
        // 根据块的大小动态调整圆角
        const itemWidth = d.x1 - d.x0;
        const itemHeight = d.y1 - d.y0;
        const minSize = Math.min(itemWidth, itemHeight);
        
        if (minSize > 100) return '10px';
        if (minSize > 60) return '8px';
        if (minSize > 40) return '6px';
        if (minSize > 25) return '4px';
        return '3px';
      })
      .html(d => {
        const itemWidth = d.x1 - d.x0;
        const itemHeight = d.y1 - d.y0;
        
        // 降低显示文本的最小尺寸要求
        if (itemWidth < 25 || itemHeight < 20) {
          return ''; // 太小的块不显示文本
        }
        
        // 根据块的大小调整字体
        const nameFontSize = Math.max(9, Math.min(itemWidth / 8, itemHeight / 4, 14));
        const valueFontSize = Math.max(11, Math.min(itemWidth / 6, itemHeight / 3, 16));
        
        // 根据块大小决定显示内容
        let content = '';
        
        // 计算块的面积作为判断依据
        const area = itemWidth * itemHeight;
        
        if (area > 2400 || (itemWidth > 60 && itemHeight > 35)) {
          // 大块：显示名称和数值
          content = `
            <div style="
              font-size: ${nameFontSize}px;
              font-weight: 500;
              line-height: 1.2;
              margin-bottom: 2px;
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
        } else if (area > 1200 || (itemWidth > 40 && itemHeight > 25)) {
          // 中块：优先显示名称（缩写）
          const maxChars = Math.floor(itemWidth / 6.5);
          let displayName = d.data.name;
          
          if (displayName.length > maxChars && maxChars > 3) {
            displayName = displayName.substring(0, maxChars - 1) + '...';
          } else if (displayName.length > maxChars) {
            displayName = displayName.substring(0, Math.max(2, maxChars));
          }
          
          content = `
            <div style="
              font-size: ${Math.max(9, Math.min(nameFontSize, 12))}px;
              font-weight: 500;
              line-height: 1.2;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              max-width: 100%;
            ">${displayName}</div>
          `;
        } else {
          // 小块：也优先显示名称缩写
          const maxChars = Math.floor(itemWidth / 7);
          let displayName = d.data.name;
          
          if (displayName.length > maxChars && maxChars > 2) {
            displayName = displayName.substring(0, Math.max(2, maxChars - 1)) + '...';
          } else if (displayName.length > maxChars) {
            displayName = displayName.substring(0, Math.max(2, maxChars));
          }
          
          content = `
            <div style="
              font-size: ${Math.max(8, Math.min(nameFontSize, 10))}px;
              font-weight: 500;
              line-height: 1.1;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              max-width: 100%;
            ">${displayName}</div>
          `;
        }
        
        return `
          <div style="
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 100%;
            padding: 2px;
            color: #fff;
            text-align: center;
          ">
            ${content}
          </div>
        `;
      });

    // 添加悬停效果和点击事件
    nodes
      .style('cursor', onItemClick ? 'pointer' : 'default')
      .on('mouseenter', function() {
        d3.select(this)
          .style('opacity', '0.9')
          .style('transform', 'scale(1.02)')
          .style('z-index', '10');
      })
      .on('mouseleave', function() {
        d3.select(this)
          .style('opacity', '1')
          .style('transform', 'scale(1)')
          .style('z-index', '1');
      })
      .on('click', function(event, d) {
        if (onItemClick) {
          onItemClick(d.data.raw ?? d.data);
        }
      });

  }, [list, name, desc, onItemClick]);

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
      style={{ position: 'relative', width: '100%', minHeight: '600px' }}
    />
  );
};

export default MoziTreeMap;
