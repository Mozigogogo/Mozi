'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { NavBar, Button, Toast } from 'antd-mobile';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import styles from './page.module.less';

export default function UserIdentityPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, i18n } = useTranslation();

  const initialValue = searchParams.get('value') || '';
  const [selected, setSelected] = useState(initialValue);
  const isEnglish = i18n.language?.toLowerCase().startsWith('en');

  useEffect(() => {
    setSelected(initialValue);
  }, [initialValue]);

  /** Maps option value → filename under /public/images/identify */
  const options = useMemo(
    () => [
      { value: 'compliance', image: 'Compliance.svg', label: t('editProfile.identity.options.compliance'), sub: t('editProfile.identity.subOptions.compliance') },
      { value: 'trader', image: 'trader.svg', label: t('editProfile.identity.options.trader'), sub: t('editProfile.identity.subOptions.trader') },
      { value: 'quant', image: 'quant.svg', label: t('editProfile.identity.options.quant'), sub: t('editProfile.identity.subOptions.quant') },
      { value: 'creator', image: 'content_creator.svg', label: t('editProfile.identity.options.creator'), sub: t('editProfile.identity.subOptions.creator') },
      { value: 'community_builder', image: 'community_builder.svg', label: t('editProfile.identity.options.community_builder'), sub: t('editProfile.identity.subOptions.community_builder') },
      { value: 'institution', image: 'market_maker.svg', label: t('editProfile.identity.options.institution'), sub: t('editProfile.identity.subOptions.institution') },
      { value: 'project_member', image: 'builder.svg', label: t('editProfile.identity.options.project_member'), sub: t('editProfile.identity.subOptions.project_member') },
      { value: 'researcher', image: 'researcher.svg', label: t('editProfile.identity.options.researcher'), sub: t('editProfile.identity.subOptions.researcher') },
      { value: 'educator', image: 'educator.svg', label: t('editProfile.identity.options.educator'), sub: t('editProfile.identity.subOptions.educator') },
      { value: 'retail', image: 'retail.svg', label: t('editProfile.identity.options.retail'), sub: t('editProfile.identity.subOptions.retail') },
    ],
    [t]
  );

  const handleConfirm = () => {
    if (!selected) {
      Toast.show({ content: t('editProfile.identity.placeholder') || '请选择身份标签' });
      return;
    }
    // 与 URL 双通道传递，避免 Next 客户端导航 / Strict Mode 下 query 读取时机导致编辑页拿不到身份
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('mozi_pending_profile_identity', selected);
      }
    } catch {
      /* ignore */
    }
    router.push(`/user/edit?identity=${encodeURIComponent(selected)}`);
  };

  return (
    <div className={styles.container}>
      <NavBar onBack={() => router.back()} className={styles.navBar}>
        {t('editProfile.identity.label') || '身份标签'}
      </NavBar>

      <div className={styles.content}>
        <div className={styles.grid}>
          {options.map((opt) => {
            const isActive = opt.value === selected;
            return (
              <button
                key={opt.value}
                type="button"
                className={`${styles.card} ${isActive ? styles.cardActive : ''}`}
                onClick={() => setSelected(opt.value)}
              >
                <div className={styles.iconWrap} aria-hidden="true">
                  <img
                    className={styles.icon}
                    src={`/images/identify/${opt.image}`}
                    alt=""
                    loading="lazy"
                  />
                </div>
                <div className={styles.cardText}>
                  <div className={`${styles.cardTitle} ${isEnglish ? styles.cardTitleEn : ''}`}>{opt.label}</div>
                  <div className={`${styles.cardSub} ${isEnglish ? styles.cardSubEn : ''}`}>{opt.sub}</div>
                </div>
                {isActive ? <div className={`${styles.check} ${styles.checkActive}`} /> : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.footer}>
        <Button block className={styles.confirmBtn} onClick={handleConfirm}>
          {t('common.confirm') || '确定'}
        </Button>
      </div>
    </div>
  );
}

