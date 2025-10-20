'use client';

import React, { useState } from 'react';
import { SpinLoading, Empty } from 'antd-mobile';
import RankGrid from '../RankGrid';
import styles from './index.module.less';

const MoziCard = ({ 
  title,
  customTitle,
  sumNum, 
  children, 
  type = 'default', 
  callback, 
  selectArr = [], 
  moreDesc, 
  pickChange,
  // 样式相关props（与原项目保持一致）
  borderRadius = '8px',
  backgroundColor = '#fff',
  marginBottom = '10px',
  customStyle = {},
  className = '',
  // 新增的排行榜相关props
  data = [],
  loading = false,
  error = false,
  selectData = [],
  selectIndex = 0,
  onSelectChange,
  onItemClick,
  onMoreClick
}) => {
  // 合并默认样式和自定义样式（customStyle 优先级最高）
  const cardStyle = {
    borderRadius,
    backgroundColor,
    marginBottom,
    ...customStyle
  };
  
  const renderTitle = () => {
    // 如果有自定义标题，直接返回
    if (customTitle) {
      return customTitle;
    }
    
    // 如果是榜单类型
    if (title && (title.includes('榜') || title.includes('排行'))) {
      return (
        <div className={styles.rankTitle}>
          <div>{title}</div>
          {/* <div className={styles.rankTitleTime}>实时更新</div> */}
        </div>
      );
    }
    
    // 普通标题
    return (
      <div className={styles.title} onClick={callback}>
        <span>{title}</span>
        {sumNum > 0 && <span className={styles.titleNum}>({sumNum})</span>}
      </div>
    );
  };

  const renderRankContent = () => {
    if (loading) {
      return (
        <div className={styles.loading}>
          <SpinLoading size='large' />
        </div>
      );
    }

    if (error) {
      return (
        <div className={styles.error}>
          <Empty description='加载失败，请重试' />
        </div>
      );
    }

    if (!data || data.length === 0) {
      return (
        <div className={styles.empty}>
          <Empty description='暂无数据' />
        </div>
      );
    }

    // 交易所排行榜特殊处理
    if (title === '交易所排行榜') {
      return (
        <div className={styles.exchangeGrid}>
          <div className={styles.gridHeader}>
            <div className={styles.gridCol}>交易所</div>
            <div className={`${styles.gridCol} ${styles.textRight}`}>24H交易量</div>
            <div className={`${styles.gridCol} ${styles.textRight}`}>市场</div>
            <div className={`${styles.gridCol} ${styles.textRight}`}>货币</div>
          </div>
          {data.map((item, index) => (
            <div key={index} className={styles.gridRow} onClick={() => onItemClick && onItemClick(item)}>
              <div className={styles.gridCol}>
                <img src={item.url} alt={item.exchange} className={styles.exchangeIcon} />
                <span>{item.exchange}</span>
              </div>
              <div className={`${styles.gridCol} ${styles.textRight}`}>{item.usd}</div>
              <div className={`${styles.gridCol} ${styles.textRight}`}>{item.markets}</div>
              <div className={`${styles.gridCol} ${styles.textRight}`}>{item.coins}</div>
            </div>
          ))}
        </div>
      );
    }

    // 其他榜单使用RankGrid组件
    const getColNames = () => {
      switch (title) {
        case '涨幅榜':
        case '跌幅榜':
        case '波幅榜':
          return ['币种', title.replace('榜', '')];
        case '成交额榜':
          return ['币种', '成交额'];
        case '新币榜':
          return ['币种', '最新价'];
        case '飙升榜':
          return ['币种', '成交额'];
        default:
          return ['币种', '数值'];
      }
    };

    return (
      <RankGrid
        length={2}
        colName={getColNames()}
        gridContent={data}
        callback={onItemClick}
      />
    );
  };

  // 如果是排行榜类型且没有children，使用榜单渲染逻辑
  if (title && (title.includes('榜') || title.includes('排行')) && !children && (selectData?.length > 0 || onItemClick || (Array.isArray(data) && data.length > 0))) {
    return (
      <div className={`${styles.card} ${className}`} style={cardStyle}>
        <div className={styles.cardHeader}>
          {renderTitle()}
          <CardExtra 
            type={selectData && selectData.length > 0 ? 'select' : 'more'}
            callback={onMoreClick} 
            selectArr={selectData?.map(item => item.name) || []} 
            selectIndex={selectIndex}
            moreDesc={moreDesc} 
            pickChange={onSelectChange} 
          />
        </div>
        <div className={styles.cardBody}>
          {renderRankContent()}
        </div>
      </div>
    );
  }

  // 通用渲染逻辑
  return (
    <div className={`${styles.card} ${className}`} style={cardStyle}>
      <div className={styles.cardHeader}>
        {renderTitle()}
        {!customTitle && (
          <CardExtra 
            type={type} 
            callback={callback} 
            selectArr={selectArr} 
            moreDesc={moreDesc} 
            pickChange={pickChange} 
          />
        )}
      </div>
      <div className={styles.cardBody}>
        {children}
      </div>
    </div>
  );
};

const CardExtra = ({ type, callback, selectArr = [], selectIndex = 0, moreDesc, pickChange }) => {
  // 对于tabs类型，selected存储实际的item值；其他类型存储index
  const [selected, setSelected] = useState(type === 'tabs' ? selectArr[selectIndex] : selectIndex);

  const handleChange = (e) => {
    const index = parseInt(e.target.value);
    setSelected(index);
    pickChange && pickChange(index);
  };

  if (type === 'more') {
    return (
      <div className={styles.more} onClick={callback}>
        {moreDesc ? (
          <div className={styles.moreDesc}>{moreDesc}</div>
        ) : (
          <span className={styles.moreIcon}>›</span>
        )}
      </div>
    );
  } else if (type === 'select') {
    return (
      <div className={styles.select}>
        <select 
          className={styles.selectInput} 
          value={selectIndex !== undefined ? selectIndex : selected} 
          onChange={handleChange}
        >
          {selectArr.map((item, index) => (
            <option key={index} value={index}>{item}</option>
          ))}
        </select>
      </div>
    );
  } else if (type === 'tabs') {
    // 添加tabs类型支持（与原项目保持一致，selected比较item值）
    return (
      <div className={styles.tabsContainer}>
        {selectArr.map((item, index) => (
          <div 
            key={index}
            className={`${styles.tabItem} ${selected === item ? styles.tabActive : ''}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setSelected(item);
              pickChange && pickChange(index);
            }}
          >
            {item}
          </div>
        ))}
      </div>
    );
  }
  
  return null;
};

export default MoziCard;