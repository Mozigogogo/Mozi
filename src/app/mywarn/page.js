'use client';

import React, { useState, useEffect } from 'react';
import { SideBar, Switch, Input, Toast } from 'antd-mobile';
import { CheckOutline } from 'antd-mobile-icons';
import { request } from '../../utils/request';
import { Interface } from '../../utils/constants';
import Layout from '../../components/Layout';
import { PageLogin } from '../../components/PageLogin';
import Error from '../../components/Error';
import { isEmpty } from 'lodash';
import styles from './page.module.css';

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
    // 提取数字部分
    const numericValue = item.content.replace('%', '');
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
        // 更新本地数据
        const newWarnContent = warnData.sideData.warnContent.map((warnItem, warnIndex) => {
          if (index === warnIndex) {
            return {
              ...warnItem,
              content: formattedValue
            };
          }
          return warnItem;
        });
        
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
        const newWarnContent = warnData.sideData.warnContent.map((warnItem, warnIndex) => {
          const newWarnItem = {...warnItem};
          if (index === warnIndex) {
            newWarnItem.active = !active;
          }
          return newWarnItem;
        });
        
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
  
  if (warnData.needLogin) {
    return (
      <Layout>
        <div className={styles.loginContainer}>
          <div className={styles.loginIcon}>🔔</div>
          <div className={styles.loginTitle}>查看我的告警</div>
          <div className={styles.loginDesc}>登录后可查看和管理您的价格告警</div>
          <PageLogin 
            show={true} 
            onLoginSuccess={init}
            hideCb={() => {
              // 用户取消登录，返回上一页
              window.history.back();
            }}
          />
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout isLoading={warnData.loading} isError={warnData.error}>
      <div className={styles.box}>
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
              {warnData.sideData?.warnContent?.length > 0 && 
                warnData.sideData?.warnContent.map((item, index) => (
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
                    />
                  </div>
                ))
              }
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}