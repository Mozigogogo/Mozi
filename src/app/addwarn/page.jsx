'use client';

import { useState } from 'react';
import { SideBar, Input, Button, Dialog, Toast } from 'antd-mobile';
import Layout from '@/components/Layout';
import { request } from '@/utils/request';
import { Interface } from '@/utils/constants';
import { jump2NoTab } from '@/utils/core';
import styles from './page.module.less';

export default function Addwarn() {
  const [activeKey, setActiveKey] = useState('0');
  const [inputValue, setInputValue] = useState('');
  const [btnDisabled, setBtnDisabled] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  // 从URL获取symbol参数
  const getSymbol = () => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('symbol');
    }
    return '';
  };

  const symbol = getSymbol();

  const data = {
    '币值涨到': {
      content: {
        title: '币值涨到',
        placeholder: '请输入币值涨超数值',
      }
    },
    '币值跌到': {
      content: {
        title: '币值跌到',
        placeholder: '请输入币值跌超数值',
      }
    },
    '币值涨超': {
      content: {
        title: '币值涨超',
        placeholder: '请输入币值涨超数值',
        unit: '%'
      }
    },
    '币值跌超': {
      content: {
        title: '币值跌超',
        placeholder: '请输入币值跌超数值',
        unit: '%'
      }
    },
  };

  const dataItem = data[Object.keys(data)[parseInt(activeKey)]];

  const onChange = (value) => {
    setInputValue(value);
  };

  const addwarn = async () => {
    if (!/^[0-9]+(\.[0-9]+)?$/.test(inputValue)) {
      Toast.show({
        content: '请输入数字',
        icon: 'fail',
      });
      return;
    }

    setBtnDisabled(true);
    const sideKey = ['priceRise', 'priceFall', 'priceRiseChange24HPercent', 'priceFallChange24HPercent'];
    
    try {
      const addRes = await request({
        url: Interface.ADD_WARN,
        method: 'POST',
        data: {
          symbol,
          content: {
            [sideKey[parseInt(activeKey)]]: activeKey === '0' || activeKey === '1' ? inputValue : `${inputValue}%`
          }
        }
      });

      setBtnDisabled(false);
      
      if (addRes.data === true) {
        Toast.show({
          content: '添加告警成功',
          icon: 'success',
        });
        setShowPopup(true);
        return;
      }
      
      if (addRes.data?.isLogin === false) {
        Dialog.confirm({
          content: '请先登录',
          confirmText: '去登录',
          onConfirm: () => {
            // 跳转到登录页面或显示登录弹窗
            window.location.href = '/user';
          },
        });
        return;
      } else {
        Toast.show({
          content: addRes.errorMsg || '添加失败',
          icon: 'fail',
        });
      }
    } catch (error) {
      setBtnDisabled(false);
      Toast.show({
        content: '网络错误，请稍后再试',
        icon: 'fail',
      });
    }
  };

  return (
    <Layout>
      <div className={styles.box}>
        <div className={styles.sideBox}>
          <div className={styles.side}>
            <SideBar activeKey={activeKey} onChange={setActiveKey}>
              {Object.keys(data).map((item, index) => (
                <SideBar.Item key={index.toString()} title={item} />
              ))}
            </SideBar>
          </div>
          <div className={styles.main}>
            <div className={styles.mainTitle}>{dataItem.content.title}</div>
            <div className={styles.mainContent}>
              <Input 
                className={styles.mainInput} 
                type="number" 
                placeholder={dataItem.content.placeholder} 
                value={inputValue} 
                onChange={onChange} 
                autoFocus
              />
              {dataItem.content.unit && <div className={styles.unit}>{dataItem.content.unit}</div>}
            </div>
            <Button 
              className={`${styles.warnBtn} ${inputValue ? styles.show : styles.hide}`} 
              disabled={btnDisabled} 
              onClick={addwarn}
              color="primary"
            >
              设置告警
            </Button>
          </div>
        </div>
        <div className={styles.footer} onClick={() => jump2NoTab('mywarn')}>
          查看已配置告警
        </div>

        <Dialog
          visible={showPopup}
          content={
            <div className={styles.popContainer}>
              <div className={styles.contactTitle}>请关注公众号接受告警信息</div>
              <img
                className={styles.attendPic}
                src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/wechat_account.jpg"
                alt="公众号二维码"
              />
            </div>
          }
          closeOnAction
          onClose={() => setShowPopup(false)}
          actions={[
            {
              key: 'confirm',
              text: '确定',
            },
          ]}
        />
      </div>
    </Layout>
  );
}