'use client';

import { useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import RightArrowIcon from '../Icons/RightArrowIcon';
import { editLanguage, isEditLanguageAllowedPath } from '@/api/user';
import styles from './index.module.less';

const TAG_OPTIONS = [
  { id: 'compliance', icon: '/icons/pc/tag1.svg' },
  { id: 'trader', icon: '/icons/pc/tag2.svg' },
  { id: 'quant', icon: '/icons/pc/tag3.svg' },
  { id: 'creator', icon: '/icons/pc/tag4.svg' },
  { id: 'community_builder', icon: '/icons/pc/tag5.svg' },
  { id: 'institution', icon: '/icons/pc/tag6.svg' },
];

const LEGACY_TAG_TO_ID = {
  合规从业者: 'compliance',
  Compliance: 'compliance',
  专职交易员: 'trader',
  Trader: 'trader',
  量化研究员: 'quant',
  Quant: 'quant',
  内容创作者: 'creator',
  'Content Creator': 'creator',
  社区运营: 'community_builder',
  'Community Builder': 'community_builder',
  机构从业者: 'institution',
  'Fund/VC/Market Maker': 'institution',
};

export default function UserProfilePanelPopup({
  open,
  onClose,
  onSave,
  onLogout,
  initialData,
}) {
  const { i18n, t } = useTranslation();
  const pathname = usePathname();
  const pathForPolicy =
    pathname ||
    (typeof window !== 'undefined' ? window.location?.pathname : '') ||
    '';
  const canSyncLanguage = isEditLanguageAllowedPath(pathForPolicy);

  const data = useMemo(
    () => ({
      name: initialData?.name || '用户名',
      account: initialData?.account || t('user.profilePanel.defaultAccount'),
      bio: initialData?.bio || t('user.defaultBio'),
      email: initialData?.email || 'carlakorsgaard@gmail.com',
      phone: initialData?.phone || '+8234567900',
      commission: initialData?.commission || 'TronUSDTbinubho',
      avatar: initialData?.avatar || 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/avatar.png',
      boundTelegram: initialData?.boundTelegram ?? true,
      boundWallet: initialData?.boundWallet ?? false,
      language: initialData?.language || ((i18n?.language || '').startsWith('en') ? 'English' : '中文（中国）'),
      selectedTagId:
        initialData?.selectedTagId ||
        LEGACY_TAG_TO_ID[initialData?.selectedTag] ||
        'creator',
    }),
    [initialData, i18n?.language, t]
  );

  const [selectedTagId, setSelectedTagId] = useState(data.selectedTagId);
  const [tagExpanded, setTagExpanded] = useState(false);
  const [languageExpanded, setLanguageExpanded] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(data.language);
  const [bio, setBio] = useState(data.bio);
  const [email, setEmail] = useState(data.email);
  const [phone, setPhone] = useState(data.phone);
  const [commission, setCommission] = useState(data.commission);
  const selectedTagLabel = t(`editProfile.identity.options.${selectedTagId}`);

  const selectLanguage = (lng) => {
    const normalizedLng = lng === 'en' ? 'en' : 'zh';

    // 先本地即时生效，避免被接口耗时阻塞
    setSelectedLanguage(normalizedLng === 'en' ? 'English' : '中文（中国）');
    i18n.changeLanguage(normalizedLng);

    if (typeof window !== 'undefined') {
      localStorage.setItem('i18nextLng', normalizedLng);
      if (localStorage.getItem('token') && canSyncLanguage) {
        editLanguage(normalizedLng).catch((e) => {
          console.error('[UserProfilePanelPopup] editLanguage failed:', e);
        });
      }
    }
  };

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.floatingPanel} onClick={(e) => e.stopPropagation()}>
      <div className={styles.panel}>
        <div className={styles.headerCard}>
          <img src={data.avatar} alt={data.name} className={styles.avatar} />
          <div className={styles.headerRight}>
            <div className={styles.name}>{data.name}</div>
            <div className={styles.account}>{data.account}</div>
            <div className={styles.channelBtn}>{t('user.profilePanel.viewChannel')}</div>
          </div>
        </div>

        <div className={styles.sectionCard}>
          <div className={styles.bindRow}>
            <div className={styles.bindLeft}>
              <img src="/icons/pc/bind_telegram.svg" alt="" />
              <span>{t('user.profilePanel.telegram')}</span>
            </div>
            <div className={styles.boundBtn}>
              {data.boundTelegram ? t('user.profilePanel.bound') : t('user.profilePanel.bind')}
            </div>
          </div>
          <div className={styles.bindRow}>
            <div className={styles.bindLeft}>
              <img src="/icons/pc/wallet.svg" alt="" />
              <span>{t('user.profilePanel.wallet')}</span>
            </div>
            <div className={styles.unboundBtn}>
              <img src="/icons/pc/plus.svg" alt="" />
              <span>{data.boundWallet ? t('user.profilePanel.bound') : t('user.profilePanel.bind')}</span>
            </div>
          </div>
        </div>

        <div className={styles.sectionCard}>
          <div
            className={styles.labelRow}
            onClick={() => setTagExpanded((prev) => !prev)}
          >
            <div className={styles.labelTitle}>
              <img src="/icons/new_user/user_tag_90A1B9.svg" alt="" />
              <div>
                <div className={styles.labelMain}>{t('editProfile.identity.label')}</div>
                <div className={styles.labelSub}>{selectedTagLabel}</div>
              </div>
            </div>
            <RightArrowIcon
              size={16}
              color="#9ca3af"
              className={`${styles.rowArrow} ${tagExpanded ? styles.rowArrowExpanded : ''}`}
            />
          </div>

          {tagExpanded ? (
            <div className={styles.tagGrid}>
              {TAG_OPTIONS.map((tag) => (
                <div
                  key={tag.id}
                  className={`${styles.tagItem} ${selectedTagId === tag.id ? styles.tagActive : ''}`}
                  onClick={() => setSelectedTagId(tag.id)}
                >
                  <img src={tag.icon} alt="" className={styles.tagIcon} />
                  <div className={styles.tagTextWrap}>
                    <span>{t(`editProfile.identity.options.${tag.id}`)}</span>
                    {selectedTagId === tag.id ? <span className={styles.check}>✓</span> : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div className={styles.formRow}>
            <img src="/icons/pc/user_icon.svg" alt="" />
            <div className={styles.formField}>
              <div className={styles.formLabel}>{t('editProfile.bio.label')}</div>
              <input value={bio} onChange={(e) => setBio(e.target.value)} />
            </div>
          </div>
          <div className={styles.formRow}>
            <img src="/icons/pc/email.svg" alt="" />
            <div className={styles.formField}>
              <div className={styles.formLabel}>{t('editProfile.email.label')}</div>
              <input value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div className={styles.formRow}>
            <img src="/icons/pc/phone.svg" alt="" />
            <div className={styles.formField}>
              <div className={styles.formLabel}>{t('editProfile.phone.label')}</div>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <div className={styles.formRow}>
            <img src="/icons/pc/earn.svg" alt="" />
            <div className={styles.formField}>
              <div className={styles.formLabel}>{t('editProfile.commission.label')}</div>
              <input value={commission} onChange={(e) => setCommission(e.target.value)} />
            </div>
          </div>
        </div>

        <div
          className={styles.logoutBtn}
          onClick={() => onLogout?.()}
        >
          <img src="/icons/pc/logout.svg" alt="" className={styles.logoutIcon} />
          <span>{t('user.profilePanel.logout')}</span>
        </div>

        <div className={styles.sectionCard}>
          <div className={styles.bottomRow} onClick={() => onSave?.()}>
            <div className={styles.bottomLeft}>
              <img src="/icons/pc/vip.svg" alt="" />
              <span>{t('user.profilePanel.subscriptionAndMembership')}</span>
            </div>
          </div>
          <div
            className={styles.bottomRow}
            onClick={() => setLanguageExpanded((prev) => !prev)}
          >
            <div className={styles.bottomLeft}>
              <img src="/icons/pc/language.svg" alt="" />
              <span>{t('user.language')}：{selectedLanguage}</span>
            </div>
            <RightArrowIcon
              size={16}
              color="#9ca3af"
              className={`${styles.rowArrow} ${languageExpanded ? styles.rowArrowExpanded : ''}`}
            />
          </div>
          {languageExpanded ? (
            <div className={styles.languagePanel}>
              <div
                className={styles.languageItem}
                onClick={() => selectLanguage('zh')}
              >
                中文（中国）
              </div>
              <div
                className={styles.languageItem}
                onClick={() => selectLanguage('en')}
              >
                English
              </div>
            </div>
          ) : null}
        </div>
      </div>
      </div>
    </div>
  );
}

