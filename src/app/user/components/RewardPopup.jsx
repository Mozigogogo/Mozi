import React, { useEffect, useRef, useState } from 'react';
import { Toast } from 'antd-mobile';
import styles from '@/app/user/page.module.less';
import CopyIcon from '@/components/Icons/CopyIcon';
import { COINKEY } from '@/utils/constants';

const RewardPopup = ({ visible, onClose, t, isPC = false }) => {
  const scrollRef = useRef(null);
  const [activePage, setActivePage] = useState(0);

  useEffect(() => {
    if (!visible) return;
    setActivePage(0);
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ left: 0, behavior: 'auto' });
    }
  }, [visible]);

  if (!visible) return null;

  const copyToClipboard = (value) => {
    navigator.clipboard.writeText(value).then(() => {
      Toast.show({ content: t('user.copySuccess'), position: 'bottom' });
    }).catch(() => {
      Toast.show({ content: t('user.copyFailed'), position: 'bottom' });
    });
  };

  return (
    <div
      className={`${styles.rewardMask} ${isPC ? styles.rewardMaskPc : ''}`}
      onClick={onClose}
    >
      <div
        className={`${styles.rewardPopup} ${isPC ? styles.rewardPopupPc : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`${styles.contactTitle} ${isPC ? styles.contactTitlePc : ''}`}>
          {t('user.donateSupport')}
        </div>
        <div
          ref={scrollRef}
          className={`${styles.rewardScrollBox} ${isPC ? styles.rewardScrollBoxPc : ''}`}
          onScroll={(e) => {
            if (!isPC) return;
            const el = e.currentTarget;
            const width = el.clientWidth || 1;
            const nextPage = Math.round(el.scrollLeft / width);
            if (nextPage !== activePage) setActivePage(nextPage);
          }}
        >
          {/* 第一页：区块链地址列表 */}
          <div className={`${styles.rewardPage} ${isPC ? styles.rewardPagePc : ''}`}>
            <div className={`${styles.addressList} ${isPC ? styles.addressListPc : ''}`}>
              <div className={`${styles.addressItem} ${isPC ? styles.addressItemPc : ''}`}>
                <div className={`${styles.addressLabel} ${isPC ? styles.addressLabelPc : ''}`}>BTC</div>
                <div className={`${styles.addressContent} ${isPC ? styles.addressContentPc : ''}`}>
                  <span className={`${styles.addressText} ${isPC ? styles.addressTextPc : ''}`}>{COINKEY.BTC}</span>
                  <div className={styles.contactCopy} onClick={() => copyToClipboard(COINKEY.BTC)}>
                    <CopyIcon width={18} height={18} color="var(--text-secondary)" />
                  </div>
                </div>
              </div>
              <div className={`${styles.addressItem} ${isPC ? styles.addressItemPc : ''}`}>
                <div className={`${styles.addressLabel} ${isPC ? styles.addressLabelPc : ''}`}>ETH</div>
                <div className={`${styles.addressContent} ${isPC ? styles.addressContentPc : ''}`}>
                  <span className={`${styles.addressText} ${isPC ? styles.addressTextPc : ''}`}>{COINKEY.ETH}</span>
                  <div className={styles.contactCopy} onClick={() => copyToClipboard(COINKEY.ETH)}>
                    <CopyIcon width={18} height={18} color="var(--text-secondary)" />
                  </div>
                </div>
              </div>
              <div className={`${styles.addressItem} ${isPC ? styles.addressItemPc : ''}`}>
                <div className={`${styles.addressLabel} ${isPC ? styles.addressLabelPc : ''}`}>TRON</div>
                <div className={`${styles.addressContent} ${isPC ? styles.addressContentPc : ''}`}>
                  <span className={`${styles.addressText} ${isPC ? styles.addressTextPc : ''}`}>{COINKEY.TRON}</span>
                  <div className={styles.contactCopy} onClick={() => copyToClipboard(COINKEY.TRON)}>
                    <CopyIcon width={18} height={18} color="var(--text-secondary)" />
                  </div>
                </div>
              </div>
            </div>
            {!isPC ? (
              <div className={styles.swipeHint}>{t('user.swipeToWechat')}</div>
            ) : null}
          </div>
          
          {/* 第二页：微信支付二维码 */}
          <div className={`${styles.rewardPage} ${isPC ? styles.rewardPagePc : ''}`}>
            <div className={`${styles.qrcodeBox} ${isPC ? styles.qrcodeBoxPc : ''}`}>
              <img
                className={`${styles.qrcodeImg} ${isPC ? styles.qrcodeImgPc : ''}`}
                src='https://image-1317406749.cos.ap-shanghai.myqcloud.com/wechat_pay.jpg'
                alt={t('user.wechatPay')}
              />
              <div className={`${styles.qrcodeLabel} ${isPC ? styles.qrcodeLabelPc : ''}`}>{t('user.wechatPay')}</div>
            </div>
          </div>
        </div>
        {isPC ? (
          <div className={styles.rewardPagerPc}>
            <button
              type="button"
              className={styles.rewardPagerBtnPc}
              disabled={activePage <= 0}
              onClick={() => {
                if (!scrollRef.current) return;
                const width = scrollRef.current.clientWidth || 1;
                const target = Math.max(0, activePage - 1);
                scrollRef.current.scrollTo({ left: width * target, behavior: 'smooth' });
                setActivePage(target);
              }}
              aria-label="prev"
            >
              {'<'}
            </button>
            <button
              type="button"
              className={styles.rewardPagerBtnPc}
              disabled={activePage >= 1}
              onClick={() => {
                if (!scrollRef.current) return;
                const width = scrollRef.current.clientWidth || 1;
                const target = Math.min(1, activePage + 1);
                scrollRef.current.scrollTo({ left: width * target, behavior: 'smooth' });
                setActivePage(target);
              }}
              aria-label="next"
            >
              {'>'}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default RewardPopup;
