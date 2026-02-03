import React from 'react';
import { Toast } from 'antd-mobile';
import styles from '@/app/user/page.module.less';
import CopyIcon from '@/components/Icons/CopyIcon';
import { COINKEY } from '@/utils/constants';

const RewardPopup = ({ visible, onClose, t }) => {
  if (!visible) return null;

  const copyToClipboard = (value) => {
    navigator.clipboard.writeText(value).then(() => {
      Toast.show({ content: t('user.copySuccess'), position: 'bottom' });
    }).catch(() => {
      Toast.show({ content: t('user.copyFailed'), position: 'bottom' });
    });
  };

  return (
    <div className={styles.rewardMask} onClick={onClose}>
      <div className={styles.rewardPopup} onClick={(e) => e.stopPropagation()}>
        <div className={styles.contactTitle}>{t('user.donateSupport')}</div>
        <div className={styles.rewardScrollBox}>
          {/* 第一页：区块链地址列表 */}
          <div className={styles.rewardPage}>
            <div className={styles.addressList}>
              <div className={styles.addressItem}>
                <div className={styles.addressLabel}>BTC</div>
                <div className={styles.addressContent}>
                  <span className={styles.addressText}>{COINKEY.BTC}</span>
                  <div className={styles.contactCopy} onClick={() => copyToClipboard(COINKEY.BTC)}>
                    <CopyIcon width={18} height={18} color="var(--text-secondary)" />
                  </div>
                </div>
              </div>
              <div className={styles.addressItem}>
                <div className={styles.addressLabel}>ETH</div>
                <div className={styles.addressContent}>
                  <span className={styles.addressText}>{COINKEY.ETH}</span>
                  <div className={styles.contactCopy} onClick={() => copyToClipboard(COINKEY.ETH)}>
                    <CopyIcon width={18} height={18} color="var(--text-secondary)" />
                  </div>
                </div>
              </div>
              <div className={styles.addressItem}>
                <div className={styles.addressLabel}>TRON</div>
                <div className={styles.addressContent}>
                  <span className={styles.addressText}>{COINKEY.TRON}</span>
                  <div className={styles.contactCopy} onClick={() => copyToClipboard(COINKEY.TRON)}>
                    <CopyIcon width={18} height={18} color="var(--text-secondary)" />
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.swipeHint}>{t('user.swipeToWechat')}</div>
          </div>
          
          {/* 第二页：微信支付二维码 */}
          <div className={styles.rewardPage}>
            <div className={styles.qrcodeBox}>
              <img className={styles.qrcodeImg} src='https://image-1317406749.cos.ap-shanghai.myqcloud.com/wechat_pay.jpg' alt={t('user.wechatPay')} />
              <div className={styles.qrcodeLabel}>{t('user.wechatPay')}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RewardPopup;
