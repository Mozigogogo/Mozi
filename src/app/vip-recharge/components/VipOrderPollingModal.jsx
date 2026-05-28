'use client';

import React from 'react';
import { SpinLoading } from 'antd-mobile';
import { Modal } from '@/components/Modal';
import styles from './VipOrderPollingModal.module.less';

/**
 * 支付后轮询订单状态时的弹窗 loading（非全屏 LogoLoading）。
 * 用户可点击「隐藏」关闭弹窗，后台轮询仍会继续。
 */
export default function VipOrderPollingModal({ open, onHide, t }) {
  return (
    <Modal open={open} maskClosable={false}>
      <div className={styles.body}>
        <SpinLoading style={{ '--size': '36px' }} color="primary" />
        <div className={styles.title}>{t('vipRecharge.orderPolling.title')}</div>
        <div className={styles.desc}>{t('vipRecharge.orderPolling.desc')}</div>
        <button type="button" className={styles.hideBtn} onClick={onHide}>
          {t('vipRecharge.orderPolling.hide')}
        </button>
      </div>
    </Modal>
  );
}
