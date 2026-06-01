'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import RightArrowIcon from '../Icons/RightArrowIcon';
import { getUserDataInfo, updateUserInfo } from '@/api/user';
import styles from './index.module.less';

const CDN_PUBLIC_PREFIX = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public';

const TAG_OPTIONS = [
  { id: 'compliance', icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/pc/tag1.svg' },
  { id: 'trader', icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/pc/tag2.svg' },
  { id: 'quant', icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/pc/tag3.svg' },
  { id: 'creator', icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/pc/tag4.svg' },
  { id: 'community_builder', icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/pc/tag5.svg' },
  { id: 'institution', icon: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/pc/tag6.svg' },
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

const pickFirstNonEmptyString = (...vals) => {
  for (const v of vals) {
    if (v == null) continue;
    const s = String(v).trim();
    if (s !== '') return s;
  }
  return '';
};

/** 是否已绑定 Telegram（PC 账号与 TG 关联），兼容多种后端字段名 */
const resolveTelegramBound = (data, user) => {
  const pickBool = (...vals) => {
    for (const v of vals) {
      if (typeof v === 'boolean') return v;
      if (v === 1 || v === '1' || v === 'true') return true;
      if (v === 0 || v === '0' || v === 'false') return false;
    }
    return null;
  };

  const explicit = pickBool(
    data?.telegramBound,
    data?.isTelegramBound,
    data?.bindTelegram,
    data?.telegramBind,
    data?.hasTelegram,
    user?.telegramBound,
    user?.isTelegramBound,
    user?.bindTelegram,
    user?.telegramBind,
    user?.hasTelegram,
  );
  if (explicit !== null) return explicit;

  const tgId = pickFirstNonEmptyString(
    data?.telegramId,
    user?.telegramId,
    data?.telegramUserId,
    user?.telegramUserId,
    data?.tgId,
    user?.tgId,
    data?.tgUserId,
    user?.tgUserId,
  );
  return Boolean(tgId);
};

const formatPhone = (data, user) => {
  const ap = pickFirstNonEmptyString(
    data?.alertPhone,
    user?.alertPhone,
    data?.phoneNumber,
    user?.phoneNumber,
    data?.phone,
    user?.phone
  );
  const apc = pickFirstNonEmptyString(data?.alertPhoneCountryCode, user?.alertPhoneCountryCode);
  if (!ap) return '';
  if (/^\+\d/.test(ap)) return ap;
  return apc ? `${apc} ${ap}`.trim() : ap;
};

const mapDatainfoToPopupData = (rawData, fallbackData) => {
  const data = rawData && typeof rawData === 'object' ? rawData : {};
  const user = data?.userInfo && typeof data.userInfo === 'object' ? data.userInfo : {};
  const identityRaw = pickFirstNonEmptyString(data?.identityTag, user?.identityTag);
  const selectedTagId = LEGACY_TAG_TO_ID[identityRaw] || identityRaw || fallbackData.selectedTagId;

  const next = {
    ...fallbackData,
    name: pickFirstNonEmptyString(user?.nickName, user?.nickname, data?.nickName, data?.nickname, fallbackData.name),
    bio: pickFirstNonEmptyString(data?.introduction, user?.introduction, fallbackData.bio),
    email: pickFirstNonEmptyString(data?.alertEmail, user?.alertEmail, data?.email, user?.email, fallbackData.email),
    phone: formatPhone(data, user) || fallbackData.phone,
    commission: pickFirstNonEmptyString(data?.tronUsdtAddress, user?.tronUsdtAddress, data?.commissionId, user?.commissionId, fallbackData.commission),
    avatar: pickFirstNonEmptyString(user?.avatar, data?.avatar, fallbackData.avatar),
    selectedTagId,
    boundTelegram: resolveTelegramBound(data, user),
    boundWallet: !!pickFirstNonEmptyString(user?.walletAddress, data?.walletAddress, user?.address, data?.address),
  };
  next.account = next.bio || fallbackData.account;

  return next;
};

const COMMISSION_SAVE_DEBOUNCE_MS = 500;

const syncCommissionToLocalStorage = (value) => {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem('userDataInfo');
    if (!raw) return;
    const parsed = JSON.parse(raw);
    parsed.tronUsdtAddress = value;
    if (parsed.userInfo && typeof parsed.userInfo === 'object') {
      parsed.userInfo.tronUsdtAddress = value;
    }
    localStorage.setItem('userDataInfo', JSON.stringify(parsed));
  } catch (error) {
    console.error('[UserProfilePanelPopup] sync commission to localStorage failed:', error);
  }
};

export default function UserProfilePanelPopup({
  open,
  onClose,
  onSave,
  onLogout,
  onBindBenefitCode,
  initialData,
}) {
  const { i18n, t } = useTranslation();
  const router = useRouter();

  const data = useMemo(
    () => ({
      name: initialData?.name || '用户名',
      account: initialData?.bio || initialData?.account || t('user.defaultBio'),
      bio: initialData?.bio || t('user.defaultBio'),
      email: initialData?.email || 'carlakorsgaard@gmail.com',
      phone: initialData?.phone || '+8234567900',
      commission: initialData?.commission || 'TronUSDTbinubho',
      avatar: initialData?.avatar || 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/avatar.png',
      boundTelegram: initialData?.boundTelegram ?? false,
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
  const [profileData, setProfileData] = useState(data);
  const selectedTagLabel = t(`editProfile.identity.options.${selectedTagId}`);
  const commissionSaveTimerRef = useRef(null);
  const lastSavedCommissionRef = useRef((data.commission || '').trim());

  useEffect(() => {
    setProfileData(data);
    setSelectedTagId(data.selectedTagId);
    setSelectedLanguage(data.language);
    setBio(data.bio);
    setEmail(data.email);
    setPhone(data.phone);
    setCommission(data.commission);
    lastSavedCommissionRef.current = (data.commission || '').trim();
  }, [data]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const hydrateFromLocal = () => {
      try {
        const raw = localStorage.getItem('userDataInfo');
        if (!raw) return;
        const parsed = JSON.parse(raw);
        const normalized = parsed?.data && typeof parsed.data === 'object' ? parsed.data : parsed;
        const mapped = mapDatainfoToPopupData(normalized, data);
        if (cancelled) return;
        setProfileData(mapped);
        setSelectedTagId(mapped.selectedTagId);
        setBio(mapped.bio);
        setEmail(mapped.email);
        setPhone(mapped.phone);
        setCommission(mapped.commission);
        lastSavedCommissionRef.current = (mapped.commission || '').trim();
      } catch (error) {
        console.error('[UserProfilePanelPopup] parse local userDataInfo failed:', error);
      }
    };

    const fetchDatainfo = async () => {
      try {
        const res = await getUserDataInfo();
        if (cancelled || !res?.data) return;
        const mapped = mapDatainfoToPopupData(res.data, data);
        setProfileData(mapped);
        setSelectedTagId(mapped.selectedTagId);
        setBio(mapped.bio);
        setEmail(mapped.email);
        setPhone(mapped.phone);
        setCommission(mapped.commission);
        lastSavedCommissionRef.current = (mapped.commission || '').trim();
        localStorage.setItem('userDataInfo', JSON.stringify(res.data));
      } catch (error) {
        console.error('[UserProfilePanelPopup] fetch user datainfo failed:', error);
      }
    };

    hydrateFromLocal();
    fetchDatainfo();

    return () => {
      cancelled = true;
    };
  }, [open, data]);

  const persistCommission = useCallback(async (value) => {
    const trimmed = (value || '').trim();
    if (trimmed === lastSavedCommissionRef.current) return;

    if (typeof window !== 'undefined' && !localStorage.getItem('token')) return;

    try {
      await updateUserInfo({ tronUsdtAddress: trimmed });
      lastSavedCommissionRef.current = trimmed;
      syncCommissionToLocalStorage(trimmed);
    } catch (error) {
      console.error('[UserProfilePanelPopup] update commission failed:', error);
    }
  }, []);

  const handleCommissionChange = useCallback(
    (e) => {
      const next = e.target.value;
      setCommission(next);

      if (commissionSaveTimerRef.current) {
        clearTimeout(commissionSaveTimerRef.current);
      }

      commissionSaveTimerRef.current = setTimeout(() => {
        persistCommission(next);
      }, COMMISSION_SAVE_DEBOUNCE_MS);
    },
    [persistCommission]
  );

  useEffect(
    () => () => {
      if (commissionSaveTimerRef.current) {
        clearTimeout(commissionSaveTimerRef.current);
      }
    },
    []
  );

  const handleSwitchTheme = () => {
    onClose?.();
    router.push('/theme');
  };

  const selectLanguage = async (lng) => {
    const normalizedLng = lng === 'en' ? 'en' : 'zh';

    // 先本地即时生效，避免被接口耗时阻塞
    setSelectedLanguage(normalizedLng === 'en' ? 'English' : '中文（中国）');
    i18n.changeLanguage(normalizedLng);

    if (typeof window !== 'undefined') {
      localStorage.setItem('i18nextLng', normalizedLng);
      if (localStorage.getItem('token')) {
        try {
          await updateUserInfo({ language: normalizedLng });
        } catch (e) {
          console.error('[UserProfilePanelPopup] update language failed:', e);
        }
      }
    }
  };

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.floatingPanel} onClick={(e) => e.stopPropagation()}>
      <div className={styles.panel}>
        <div className={styles.headerCard}>
          <img src={profileData.avatar} alt={profileData.name} className={styles.avatar} />
          <div className={styles.headerRight}>
            <div className={styles.name}>{profileData.name}</div>
            <div className={styles.account}>{profileData.account}</div>
            <div className={styles.channelBtn}>{t('user.profilePanel.viewChannel')}</div>
          </div>
        </div>

        <div className={styles.sectionCard}>
          <div className={styles.bindRow}>
            <div className={styles.bindLeft}>
              <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/pc/bind_telegram.svg" alt="" />
              <span>{t('user.profilePanel.telegram')}</span>
            </div>
            <button
              type="button"
              className={profileData.boundTelegram ? styles.boundBtn : styles.unboundBtn}
              onClick={() => onBindBenefitCode?.()}
            >
              {profileData.boundTelegram ? t('user.profilePanel.bound') : t('user.profilePanel.bind')}
            </button>
          </div>
        </div>

        <div className={styles.sectionCard}>
          <div
            className={styles.labelRow}
            onClick={() => setTagExpanded((prev) => !prev)}
          >
            <div className={styles.labelTitle}>
              <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/new_user/user_tag_90A1B9.svg" alt="" />
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
            <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/pc/user_icon.svg" alt="" />
            <div className={styles.formField}>
              <div className={styles.formLabel}>{t('editProfile.bio.label')}</div>
              <input value={bio} onChange={(e) => setBio(e.target.value)} />
            </div>
          </div>
          <div className={styles.formRow}>
            <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/pc/email.svg" alt="" />
            <div className={styles.formField}>
              <div className={styles.formLabel}>{t('editProfile.email.label')}</div>
              <input value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div className={styles.formRow}>
            <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/pc/phone.svg" alt="" />
            <div className={styles.formField}>
              <div className={styles.formLabel}>{t('editProfile.phone.label')}</div>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <div className={styles.formRow}>
            <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/pc/earn.svg" alt="" />
            <div className={styles.formField}>
              <div className={styles.formLabel}>{t('editProfile.commission.label')}</div>
              <input
                value={commission}
                onChange={handleCommissionChange}
                placeholder={t('editProfile.commission.placeholder')}
              />
            </div>
          </div>
        </div>

        <div
          className={styles.logoutBtn}
          onClick={() => onLogout?.()}
        >
          <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/pc/logout.svg" alt="" className={styles.logoutIcon} />
          <span>{t('user.profilePanel.logout')}</span>
        </div>

        <div className={styles.sectionCard}>
          <div className={styles.bottomRow} onClick={() => onSave?.()}>
            <div className={styles.bottomLeft}>
              <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/pc/vip.svg" alt="" />
              <span>{t('user.profilePanel.subscriptionAndMembership')}</span>
            </div>
          </div>
          <div
            className={styles.bottomRow}
            onClick={() => setLanguageExpanded((prev) => !prev)}
          >
            <div className={styles.bottomLeft}>
              <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/pc/language.svg" alt="" />
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
          <div className={styles.bottomRow} onClick={handleSwitchTheme}>
            <div className={styles.bottomLeft}>
              <img
                src={`${CDN_PUBLIC_PREFIX}/icons/pc/skin@2x.png`}
                alt=""
                style={{ width: 22, height: 22, objectFit: 'contain' }}
              />
              <span>{t('user.profilePanel.switchTheme')}</span>
            </div>
            <RightArrowIcon size={16} color="#9ca3af" className={styles.rowArrow} />
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

