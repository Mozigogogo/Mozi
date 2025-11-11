'use client';

import React, { useState, useEffect } from 'react';
import { SideBar, Switch, Input, Toast, Dialog } from 'antd-mobile';
import { CheckOutline } from 'antd-mobile-icons';
import { request } from '../../utils/request';
import { Interface } from '../../utils/constants';
// 移除 Layout，改用 NavBar 作为页面顶栏
import NavBar from '../../components/NavBar';
import { PageLogin } from '../../components/PageLogin';
import Error from '../../components/Error';
import { isEmpty } from 'lodash';
import styles from './page.module.less';

export default function Mywarn() {
  const [activeKey, setActiveKey] = useState('0');
  const [warnData, setWarnData] = useState({
    loading: true,
    error: false,
    needLogin: false,
    data: {},
    sideData: null,
  });
  const [editingIndex, setEditingIndex] = useState(-1);
  const [editValue, setEditValue] = useState('');
  
  const code2Content = {
    priceRise: '币值涨到',
    priceFall: '币值跌到',
    priceRiseChange24HPercent: '币值涨超',
    priceFallChange24HPercent: '币值跌超',
  };

  // 固定的四个报警条件配置（按顺序显示），与原项目一致
  const fixedWarningCodes = [
    { code: 'priceRise', defaultContent: '--', unit: '$' },
    { code: 'priceFall', defaultContent: '--', unit: '$' },
    { code: 'priceRiseChange24HPercent', defaultContent: '10%', unit: '%' },
    { code: 'priceFallChange24HPercent', defaultContent: '10%', unit: '%' }
  ];

  // 标准化告警列表：始终返回四个条件（如后端缺失则使用默认）
  const getStandardizedWarnContent = () => {
    const backendContent = warnData.sideData?.warnContent || [];
    return fixedWarningCodes.map(fixed => {
      const backendItem = backendContent.find(item => item.code === fixed.code);
      return backendItem ? backendItem : { code: fixed.code, content: fixed.defaultContent, active: false };
    });
  };
  
  useEffect(() => {
    init();
  }, []);
  
  const init = async () => {
    try {
      const { data } = await request({
        url: Interface.MY_WARN,
      });
      
      if (isEmpty(data)) {
        setWarnData({
          ...warnData,
          error: true,
          loading: false,
        });
        return;
      }
      
      if (data.isLogin === false) {
        setWarnData({
          ...warnData,
          loading: false,
          needLogin: true
        });
        return;
      }
      
      setWarnData({
        ...warnData,
        loading: false,
        needLogin: false,
        data,
        sideData: data[Object.keys(data)[activeKey]]
      });
    } catch (error) {
      console.error('获取告警数据失败:', error);
      setWarnData({
        ...warnData,
        error: true,
        loading: false,
      });
    }
  };
  
  const changeSide = (value) => {
    setActiveKey(value);
    setWarnData({
      ...warnData,
      sideData: warnData.data[Object.keys(warnData.data)[value]]
    });
  };
  
  const startEdit = (item, index) => {
    // 提取数字部分，如果是默认值 '--' 则设为空
    let numericValue = item.content.replace(/[%$]/g, '').trim();
    if (numericValue === '--') {
      numericValue = '';
    }
    setEditValue(numericValue);
    setEditingIndex(index);
  };
  
  const confirmEdit = async (code, index) => {
    setEditingIndex(-1);
    
    if (!/^[0-9]+(\.[0-9]+)?$/.test(editValue)) {
      Toast.show('请输入数字');
      return;
    }
    
    const symbol = Object.keys(warnData.data)[activeKey];
    const sideKey = ['priceRise', 'priceFall', 'priceRiseChange24HPercent', 'priceFallChange24HPercent'];
    const codeIndex = sideKey.indexOf(code);
    const formattedValue = (codeIndex === 0 || codeIndex === 1) ? editValue : `${editValue}%`;
    
    try {
      const addRes = await request({
        url: Interface.ADD_WARN,
        method: 'POST',
        data: {
          symbol,
          content: {
            [code]: formattedValue
          }
        }
      });
      
      if (addRes.data === true) {
        // 更新本地数据：如不存在则追加
        const backendContent = warnData.sideData.warnContent || [];
        const existingIndex = backendContent.findIndex(item => item.code === code);
        let newWarnContent;
        if (existingIndex >= 0) {
          newWarnContent = backendContent.map((item, idx) => (
            idx === existingIndex ? { ...item, content: formattedValue } : item
          ));
        } else {
          // 默认未存在：新增条目，保持当前 active（默认 false）
          const standardizedContent = getStandardizedWarnContent();
          const currentItem = standardizedContent[index];
          newWarnContent = [
            ...backendContent,
            { code: currentItem.code, content: formattedValue, active: currentItem.active }
          ];
        }
        
        setWarnData({
          ...warnData,
          sideData: {
            ...warnData.sideData,
            warnContent: newWarnContent
          }
        });
        
        setEditValue('');
        Toast.show('修改成功');
      } else {
        Toast.show(addRes.errorMsg || '修改失败');
      }
    } catch (error) {
      console.error('修改告警失败:', error);
      Toast.show('修改失败');
    }
  };
  
  const switchChange = async (code, active, index) => {
    const standardizedContent = getStandardizedWarnContent();
    const currentItem = standardizedContent[index];
    const backendContent = warnData.sideData.warnContent || [];
    const backendItem = backendContent.find(item => item.code === currentItem.code);

    // 后端未存在该条目且尝试开启，先提示设置值
    if (!backendItem && !active) {
      Toast.show('请先设置告警值');
      return;
    }

    let interfaceurl = Interface.CLOSE_WARN;
    if (!active) {
      interfaceurl = Interface.OPEN_WARN;
    }
    
    try {
      const { data } = await request({
        url: interfaceurl,
        data: {
          code,
          symbol: Object.keys(warnData.data)[activeKey]
        }
      });
      
      if (data) {
        // 更新后端数据中对应的 active 状态（按 code 匹配）
        const newWarnContent = backendContent.map((warnItem) => (
          warnItem.code === code ? { ...warnItem, active: !active } : warnItem
        ));
        
        setWarnData({
          ...warnData,
          sideData: {
            ...warnData.sideData,
            warnContent: newWarnContent
          }
        });
        
        Toast.show(active ? '关闭成功' : '启动成功');
      } else {
        Toast.show(active ? '关闭失败' : '启动失败');
      }
    } catch (error) {
      console.error('切换告警状态失败:', error);
      Toast.show(active ? '关闭失败' : '启动失败');
    }
  };

  // 删除当前币种的所有告警
  const deleteCoinAllWarns = async () => {
    const symbol = Object.keys(warnData.data)[activeKey];
    const confirm = await Dialog.confirm({
      content: `确定要删除 ${symbol} 的所有告警吗？`,
      cancelText: '取消',
      confirmText: '删除'
    });
    if (!confirm) return;

    try {
      const { data } = await request({
        url: Interface.DELETE_COIN_WARN,
        method: 'POST',
        data: { symbol }
      });
      if (data) {
        const newData = { ...warnData.data };
        delete newData[symbol];
        const symbols = Object.keys(newData);
        let newActiveKey = '0';
        let newSideData = null;
        if (symbols.length > 0) {
          if (parseInt(activeKey) > 0) {
            newActiveKey = (parseInt(activeKey) - 1).toString();
          }
          if (parseInt(newActiveKey) >= symbols.length) {
            newActiveKey = (symbols.length - 1).toString();
          }
          newSideData = newData[symbols[newActiveKey]];
        }
        setWarnData({ ...warnData, data: newData, sideData: newSideData });
        setActiveKey(newActiveKey);
        Toast.show('删除成功');
      } else {
        Toast.show('删除失败');
      }
    } catch (error) {
      console.error('删除币种告警失败:', error);
      Toast.show('删除失败');
    }
  };
  
  if (warnData.needLogin) {
    return (
      <div className={styles.box}>
        <NavBar title={'我的告警'} showMenu={false} showBorder={false} />
        <div className={styles.loginContainer}>
          <div className={styles.loginIcon}>🔔</div>
          <div className={styles.loginTitle}>查看我的告警</div>
          <div className={styles.loginDesc}>登录后可查看和管理您的价格告警</div>
          <PageLogin 
            show={true} 
            onLoginSuccess={init}
            hideCb={() => {
              window.history.back();
            }}
          />
        </div>
      </div>
    );
  }
  
  return (
      <div className={styles.box}>
        <NavBar title={'我的告警'} showBorder={false} />
        {Object.keys(warnData.data).length === 0 && !warnData.loading && (
          <div className={styles.emptyContainer}>
            <div className={styles.emptyIcon}>📊</div>
            <div className={styles.emptyTitle}>暂无告警设置</div>
            <div className={styles.emptyDesc}>设置价格告警，及时掌握市场动态</div>
            <div 
              className={styles.emptyButton}
              onClick={() => window.history.back()}
            >
              返回设置告警
            </div>
          </div>
        )}
        
        {Object.keys(warnData.data).length > 0 && (
          <div className={styles.sideBox}>
            <div className={styles.side}>
              <SideBar 
                className={styles.sidebar} 
                activeKey={activeKey} 
                onChange={changeSide}
              >
                {Object.keys(warnData?.data || {}).map((dataItem, dataIndex) => (
                  <SideBar.Item 
                    key={dataIndex} 
                    title={
                      <div className={styles.sidebarItem}>
                        <img 
                          className={styles.sidebarIcon} 
                          src={warnData?.data[dataItem].url} 
                          alt={dataItem}
                        />
                        <div>{dataItem}</div>
                      </div>
                    } 
                  />
                ))}
              </SideBar>
            </div>
            
            <div className={styles.main}>
              {warnData.sideData && 
                getStandardizedWarnContent().map((item, index) => (
                  <div className={styles.mainItem} key={index}>
                    {editingIndex === index ? (
                      <div className={styles.editContainer}>
                        <span className={styles.contentLabel}>
                          {code2Content[item.code]}
                        </span>
                        <Input 
                          className={styles.editInput}
                          value={editValue}
                          onChange={setEditValue}
                          placeholder='请输入数字'
                          type='number'
                        />
                        <div 
                          className={styles.confirmBtn} 
                          onClick={() => confirmEdit(item.code, index)}
                        >
                          <CheckOutline color='#02c076' />
                        </div>
                      </div>
                    ) : (
                      <div className={styles.contentWrapper}>
                        <span className={styles.contentLabel}>
                          {code2Content[item.code]}
                        </span>
                        <span 
                          className={styles.contentText}
                          onClick={() => startEdit(item, index)}
                        >
                          {item.content}
                        </span>
                      </div>
                    )}
                    <Switch 
                      checked={item.active} 
                      onChange={() => switchChange(item.code, item.active, index)} 
                      style={{ '--checked-color': '#11B787', transform: 'scale(0.75)' }}
                    />
                  </div>
                ))
              }
              {/* 删除整个币种的按钮 */}
              {warnData.sideData && (
                <div className={styles.deleteCoinBtn} onClick={deleteCoinAllWarns}>
                  <div className={styles.deleteCoinText}>删除 {Object.keys(warnData.data)[activeKey]}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
  );
}