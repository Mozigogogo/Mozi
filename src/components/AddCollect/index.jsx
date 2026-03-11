'use client';

import React, { useState, useEffect } from 'react';
import { Toast } from 'antd-mobile';
import { request } from '../../utils/request';
import { completeTask } from '@/api/user';
import { Interface } from '../../utils/constants';
import styles from './index.module.less';

let isClick = false;

const AddCollect = ({ isOwn: propIsOwn, symbol, loginCb, onSuccess }) => {
  const [isOwn, setOwn] = useState(null);
  const [showLogin, setShowLogin] = useState(false);

  const changeOwn = async (e) => {
    e.stopPropagation();
    if (isClick) return;
    isClick = true;
    console.log('开始添加自选');
    
    const curOwn = isOwn !== null ? isOwn : propIsOwn;
    const nextOwn = !curOwn;

    // 乐观更新：先切换 UI 状态，避免等待接口期间“卡住”的观感
    setOwn(nextOwn);
    const url = curOwn ? Interface.CANCEL_OWN : Interface.ADD_OWN;
    
    try {
      const changeOwnRes = await request({
        url,
        method: 'GET',
        data: {
          coin: symbol
        }
      });
      
      if (changeOwnRes?.data?.isLogin === false) {
        // 未登录，提示登录
        setOwn(curOwn);
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
      
      if (changeOwnRes?.code === 0 || changeOwnRes?.data) {
        // 修改成功
        Toast.show({
          content: curOwn ? '移除自选成功' : '加入自选成功',
          icon: 'success'
        });

        // 上报 ADD_WATCHLIST 任务：仅在添加自选后且自选数量 >= 3 时上报
        if (!curOwn) {
          try {
            const ownListRes = await request({ url: Interface.COIN_SELF, method: 'GET' });
            const ownCount = ownListRes?.data?.length ?? ownListRes?.data?.list?.length ?? 0;
            if (ownCount >= 3) {
              await completeTask('ADD_WATCHLIST');
            }
          } catch (e) {
            console.error('上报 ADD_WATCHLIST 任务失败', e);
          }
        }

        setOwn(nextOwn);
        
        // 调用成功回调
        if (onSuccess) {
          onSuccess(nextOwn);
        }
      } else {
        // 接口返回异常时回滚
        setOwn(curOwn);
        Toast.show({
          content: '操作失败',
          icon: 'fail'
        });
      }
    } catch (error) {
      console.error('操作失败:', error);
      setOwn(curOwn);
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
      <img
        key={curOwn ? 'liked' : 'unliked'}
        className={styles.collectIcon}
        src={curOwn ? '/icons/new_detail/like_actived.svg' : '/icons/new_detail/like_no_actived.svg'}
        alt="favorite"
      />
    </div>
  );
};

export default AddCollect;