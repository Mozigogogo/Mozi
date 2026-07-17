'use client';

import React, { useState, useEffect } from 'react';
import { SideBar, Switch, Input, Toast } from 'antd-mobile';
import { CheckOutline } from 'antd-mobile-icons';
import { useTranslation } from 'react-i18next';
import { confirm } from '@/components/Modal/confirm';
import { request } from '../../utils/request';
import { Interface } from '../../utils/constants';
// 移除 Layout，改用 NavBar 作为页面顶栏
import NavBar from '../../components/NavBar';
import PopLogin from '../../components/PopLogin';
import Error from '../../components/Error';
import { isEmpty } from 'lodash';
import {
  buildFullWarnContentPayload,
  buildFullWarnContentWithOverride,
  formatWarnContentValue,
  parseWarnContentNumeric,
} from '@/utils/warnContent';
import styles from './page.module.less';

export default function Mywarn() {
  const { t } = useTranslation();
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
    priceRise: t('myAlarm.priceRiseTo'),
    priceFall: t('myAlarm.priceFallTo'),
    priceRiseChange24HPercent: t('myAlarm.riseOver'),
    priceFallChange24HPercent: t('myAlarm.fallOver'),
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

  const buildCurrentWarnItems = () => getStandardizedWarnContent();
  
  useEffect(() => {
    init();
  }, []);
  
  const init = async () => {
    try {
      // 从统一的工具函数获取当前环境
                  const { data } = await request({
        url: Interface.MY_WARN
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
    setEditingIndex(-1);
    setEditValue('');
    setActiveKey(value);
    setWarnData((prev) => ({
      ...prev,
      sideData: prev.data[Object.keys(prev.data)[value]],
    }));
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
      Toast.show(t('myAlarm.enterNumber'));
      return;
    }
    
    const symbol = Object.keys(warnData.data)[activeKey];
    const sideKey = ['priceRise', 'priceFall', 'priceRiseChange24HPercent', 'priceFallChange24HPercent'];
    const codeIndex = sideKey.indexOf(code);
    const formattedValue = (codeIndex === 0 || codeIndex === 1) ? editValue : `${editValue}%`;
    const fullContent = buildFullWarnContentWithOverride(buildCurrentWarnItems(), code, formattedValue);

    try {
      const addRes = await request({
        url: Interface.ADD_WARN,
        method: 'POST',
        data: {
          symbol,
          content: fullContent,
        }
      });
      
      if (addRes.data === true) {
        const backendContent = warnData.sideData.warnContent || [];
        const existingIndex = backendContent.findIndex(item => item.code === code);
        let newWarnContent;
        if (existingIndex >= 0) {
          newWarnContent = backendContent.map((item, idx) => (
            idx === existingIndex ? { ...item, content: formattedValue } : item
          ));
        } else {
          const standardizedContent = getStandardizedWarnContent();
          const currentItem = standardizedContent[index];
          newWarnContent = [
            ...backendContent,
            { code: currentItem.code, content: formattedValue, active: currentItem.active }
          ];
        }

        const updatedSideData = {
          ...warnData.sideData,
          warnContent: newWarnContent,
        };
        setWarnData((prev) => ({
          ...prev,
          data: {
            ...prev.data,
            [symbol]: updatedSideData,
          },
          sideData: updatedSideData,
        }));

        setEditValue('');
        Toast.show(t('myAlarm.editSuccess'));
      } else {
        Toast.show(addRes.errorMsg || t('myAlarm.editFailed'));
      }
    } catch (error) {
      console.error('修改告警失败:', error);
      Toast.show(t('myAlarm.editFailed'));
    }
  };
  
  const switchChange = async (code, active, index) => {
    const standardizedContent = getStandardizedWarnContent();
    const currentItem = standardizedContent[index];
    const backendContent = warnData.sideData.warnContent || [];
    const symbol = Object.keys(warnData.data)[activeKey];
    const nextActive = !active;

    // 开启时：界面默认值（如 10%）可能尚未写入后端，须先 ADD 再 OPEN
    if (nextActive) {
      const numericValue = parseWarnContentNumeric(currentItem.content);
      if (!numericValue || !/^[0-9]+(\.[0-9]+)?$/.test(numericValue)) {
        Toast.show(t('myAlarm.setValueFirst'));
        return;
      }
      const formattedValue = formatWarnContentValue(code, numericValue);
      const fullContent = buildFullWarnContentWithOverride(standardizedContent, code, formattedValue);
      try {
        const addRes = await request({
          url: Interface.ADD_WARN,
          method: 'POST',
          data: { symbol, content: fullContent },
        });
        if (addRes?.data !== true) {
          Toast.show(addRes?.errorMsg || t('myAlarm.enableFailed'));
          return;
        }
      } catch (error) {
        console.error('注册告警值失败:', error);
        Toast.show(t('myAlarm.enableFailed'));
        return;
      }
    }

    const interfaceurl = active ? Interface.CLOSE_WARN : Interface.OPEN_WARN;

    try {
      const { data } = await request({
        url: interfaceurl,
        data: { code, symbol },
      });

      if (data) {
        const numericValue = parseWarnContentNumeric(currentItem.content);
        const formattedValue = formatWarnContentValue(code, numericValue);
        const newWarnContent = [...backendContent];
        const existingIndex = newWarnContent.findIndex((item) => item.code === code);
        if (existingIndex >= 0) {
          newWarnContent[existingIndex] = {
            ...newWarnContent[existingIndex],
            active: nextActive,
            ...(nextActive ? { content: formattedValue } : {}),
          };
        } else if (nextActive) {
          newWarnContent.push({ code, content: formattedValue, active: true });
        }

        const updatedSideData = {
          ...warnData.sideData,
          warnContent: newWarnContent,
        };
        setWarnData((prev) => ({
          ...prev,
          data: {
            ...prev.data,
            [symbol]: updatedSideData,
          },
          sideData: updatedSideData,
        }));

        Toast.show(active ? t('myAlarm.disableSuccess') : t('myAlarm.enableSuccess'));
      } else {
        Toast.show(active ? t('myAlarm.disableFailed') : t('myAlarm.enableFailed'));
      }
    } catch (error) {
      console.error('切换告警状态失败:', error);
      Toast.show(active ? t('myAlarm.disableFailed') : t('myAlarm.enableFailed'));
    }
  };

  // 删除当前币种的所有告警
  const deleteCoinAllWarns = async () => {
    const symbol = Object.keys(warnData.data)[activeKey];
    const confirmResult = await confirm({
      content: t('alarm.confirmDelete', { symbol }) || `确定要删除 ${symbol} 的所有告警吗？`,
      cancelText: t('common.cancel') || '取消',
      confirmText: t('common.delete') || '删除'
    });
    if (!confirmResult) return;

    try {
      // 获取 token
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      
      const res = await request({
        url: `${Interface.DELETE_ALARM}?symbol=${symbol}`,
        method: 'DELETE',
        headers: {
          authentication: token
        }
      });
      
      console.log('删除告警响应:', res);
      
      if ((res.code === 200 || res.code === 0) && res.data === true) {
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
        Toast.show(t('alarm.deleteSuccess') || '删除成功');
      } else {
        Toast.show(res.message || t('alarm.deleteFailed') || '删除失败');
      }
    } catch (error) {
      console.error('删除币种告警失败:', error);
      Toast.show(t('alarm.deleteFailed') || '删除失败');
    }
  };
  
  if (warnData.needLogin) {
    return (
      <div className={styles.box}>
        <NavBar title={t('myAlarm.title')} showMenu={false} showBorder={false} />
        {/* 与原项目一致的登录弹窗（居中卡片 + 遮罩） */}
        <PopLogin 
          visible={true}
          onLoginSuccess={init}
          onClose={() => {
            window.history.back();
          }}
        />
      </div>
    );
  }
  
  return (
      <div className={styles.box}>
        <NavBar title={t('myAlarm.title')} showBorder={false} />
        {Object.keys(warnData.data).length === 0 && !warnData.loading && (
          <div className={styles.emptyContainer}>
            {/* 与原项目一致：使用 Error 组件 + 文案“您暂未设置告警” */}
            <Error errMsg={t('myAlarm.noAlerts')} />
            <div 
              className={styles.emptyButton}
              onClick={() => window.history.back()}
            >
              {t('myAlarm.goBack')}
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
                          placeholder={t('myAlarm.enterNumber')}
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
                    <div className={styles.switchWrapper}>
                      <Switch 
                        checked={item.active} 
                        onChange={() => switchChange(item.code, item.active, index)} 
                        style={{ '--checked-color': '#11B787', transform: 'scale(0.75)' }}
                      />
                    </div>
                  </div>
                ))
              }
              {/* 删除整个币种的按钮 */}
              {warnData.sideData && (
                <div className={styles.deleteCoinBtn} onClick={deleteCoinAllWarns}>
                  <div className={styles.deleteCoinText}>{t('alarm.deleteButton', { symbol: Object.keys(warnData.data)[activeKey] }) || `删除 ${Object.keys(warnData.data)[activeKey]}`}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
  );
}