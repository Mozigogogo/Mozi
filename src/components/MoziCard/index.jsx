'use client';

import React, { useState } from 'react';
import { SpinLoading, Empty } from 'antd-mobile';
import RankGrid from '../RankGrid';
import styles from './index.module.less';

const MoziCard = ({ 
  title, 
  sumNum, 
  children, 
  type = 'default', 
  callback, 
  selectArr = [], 
  moreDesc, 
  pickChange,
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
  
  const renderRankTitle = () => {
    if (title && (title.includes('榜') || title.includes('排行'))) {
      return (
        <div className={styles.rankTitle}>
          <div>{title}</div>
          <div className={styles.rankTitleTime}>实时更新</div>
        </div>
      );
    }
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

  // 如果是排行榜类型，使用新的渲染逻辑
  // 有children的情况（如首页实时榜单）使用原有渲染逻辑
  if (title && (title.includes('榜') || title.includes('排行')) && !children && (selectData?.length > 0 || onItemClick || (Array.isArray(data) && data.length > 0))) {

    return (
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          {renderRankTitle()}
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

  // 原有的渲染逻辑
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.title} onClick={callback}>
          <span>{title}</span>
          {sumNum > 0 && <span className={styles.titleNum}>({sumNum})</span>}
        </div>
        <CardExtra 
          type={type} 
          callback={callback} 
          selectArr={selectArr} 
          moreDesc={moreDesc} 
          pickChange={pickChange} 
        />
      </div>
      <div className={styles.cardBody}>
        {children}
      </div>
    </div>
  );
};

const CardExtra = ({ type, callback, selectArr = [], selectIndex = 0, moreDesc, pickChange }) => {
  const [selected, setSelected] = useState(selectIndex);

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
  }
  
  return null;
};

export default MoziCard;