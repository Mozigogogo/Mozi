'use client';

import React, { useState, useEffect } from 'react';
import { Toast } from 'antd-mobile';
import { HeartFill } from 'antd-mobile-icons';
import { request } from '../../utils/request';
import { Interface } from '../../utils/constants';
import styles from './index.module.less';

let isClick = false;

const AddCollect = ({ isOwn: propIsOwn, symbol, loginCb }) => {
  const [isOwn, setOwn] = useState(null);
  const [showLogin, setShowLogin] = useState(false);

  const changeOwn = async (e) => {
    e.stopPropagation();
    if (isClick) return;
    isClick = true;
    console.log('开始添加自选');
    
    const curOwn = isOwn !== null ? isOwn : propIsOwn;
    const url = curOwn ? Interface.CANCEL_OWN : Interface.ADD_OWN;
    
    try {
      const changeOwnRes = await request({
        url,
        data: {
          coin: symbol
        }
      });
      
      if (changeOwnRes?.data?.isLogin === false) {
        // 未登录，提示登录
        Toast.show({
          content: '请先登录',
          icon: 'fail'
        });
        if (loginCb) {
          loginCb();
        }
        isClick = false;
        return;
      }
      
      if (changeOwnRes?.data) {
        // 修改成功
        Toast.show({
          content: curOwn ? '移除自选成功' : '加入自选成功',
          icon: 'success'
        });
        setOwn(!curOwn);
      }
    } catch (error) {
      console.error('操作失败:', error);
      Toast.show({
        content: '操作失败',
        icon: 'fail'
      });
    } finally {
      isClick = false;
    }
  };

  const curOwn = isOwn !== null ? isOwn : propIsOwn;

  return (
    <div className={styles.collect} onClick={changeOwn}>
      <HeartFill 
        fontSize={20} 
        color={curOwn ? 'red' : '#ccc'} 
      />
    </div>
  );
};

export default AddCollect;