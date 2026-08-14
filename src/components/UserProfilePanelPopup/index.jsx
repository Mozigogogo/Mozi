'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import RightArrowIcon from '../Icons/RightArrowIcon';
import { getUserDataInfo, updateUserInfo, completeTask } from '@/api/user';
import { message } from 'antd';
import styles from './index.module.less';

const CDN_PUBLIC_PREFIX = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public';
const DEFAULT_AVATAR = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/avatar.png';

const FAKE_PROFILE_VALUES = new Set([
  '用户名',
  '账号账号账号号',
  '账号账号账号账号',
  'carlakorsgaard@gmail.com',
  '+8234567900',
  'TronUSDTbinubho',
  '资金流动大师，金融NO.1',
  'Master of financial flow, Finance NO.1',
  'Master of financial flow, Finance NO',
]);

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

const sanitizeProfileText = (value, extraFakes = []) => {
  const text = String(value ?? '').trim();
  if (!text) return '';
  if (FAKE_PROFILE_VALUES.has(text) || extraFakes.includes(text)) return '';
  if (text.startsWith('资金流动大师') || text.startsWith('Master of financial flow')) return '';
  return text;
};

const resolveTagId = (raw) => {
  const text = String(raw ?? '').trim();
  if (!text) return '';
  if (TAG_OPTIONS.some((tag) => tag.id === text)) return text;
  return LEGACY_TAG_TO_ID[text] || '';
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

const resolveCurrentUserId = (...extraCandidates) => {
  const pickId = (...vals) => {
    for (const v of vals) {
      if (v == null) continue;
      const s = String(v).trim();
      if (s) return s;
    }
    return '';
  };

  if (typeof window !== 'undefined') {
    try {
      const fromStorage = localStorage.getItem('userId');
      if (fromStorage) return pickId(fromStorage, ...extraCandidates);

      const raw = localStorage.getItem('userDataInfo');
      if (raw) {
        const parsed = JSON.parse(raw);
        const data = parsed?.data && typeof parsed.data === 'object' ? parsed.data : parsed;
        const user = data?.userInfo && typeof data.userInfo === 'object' ? data.userInfo : {};
        const fromDatainfo = pickId(data?.userId, user?.userId, user?.id);
        if (fromDatainfo) return fromDatainfo;
      }

      const ui = localStorage.getItem('userInfo');
      if (ui) {
        const parsed = JSON.parse(ui);
        const fromUserInfo = pickId(parsed?.userId, parsed?.id);
        if (fromUserInfo) return fromUserInfo;
      }
    } catch (_) {}
  }

  return pickId(...extraCandidates);
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

const mapDatainfoToPopupData = (rawData, fallbackData, t) => {
  const data = rawData && typeof rawData === 'object' ? rawData : {};
  const user = data?.userInfo && typeof data.userInfo === 'object' ? data.userInfo : {};
  const fakeBio = t ? [t('user.defaultBio')] : [];
  const bio = sanitizeProfileText(
    pickFirstNonEmptyString(data?.introduction, user?.introduction),
    fakeBio
  );
  const name = sanitizeProfileText(
    pickFirstNonEmptyString(user?.nickName, user?.nickname, data?.nickName, data?.nickname, fallbackData.name)
  );

  return {
    ...fallbackData,
    name,
    bio,
    account: bio,
    email: sanitizeProfileText(
      pickFirstNonEmptyString(data?.alertEmail, user?.alertEmail, data?.email, user?.email)
    ),
    phone: sanitizeProfileText(formatPhone(data, user)),
    commission: sanitizeProfileText(
      pickFirstNonEmptyString(
        data?.tronUsdtAddress,
        user?.tronUsdtAddress,
        data?.commissionId,
        user?.commissionId
      )
    ),
    avatar: pickFirstNonEmptyString(user?.avatar, data?.avatar, fallbackData.avatar) || DEFAULT_AVATAR,
    selectedTagId: resolveTagId(pickFirstNonEmptyString(data?.identityTag, user?.identityTag)),
    boundTelegram: resolveTelegramBound(data, user),
    boundWallet: !!pickFirstNonEmptyString(user?.walletAddress, data?.walletAddress, user?.address, data?.address),
    userId: resolveCurrentUserId(
      data?.userId,
      user?.userId,
      user?.id,
      fallbackData?.userId
    ),
  };
};

const parsePhoneParts = (rawPhone) => {
  const phoneText = String(rawPhone || '').trim();
  if (!phoneText) {
    return { alertPhone: '', alertPhoneCountryCode: '' };
  }

  const match = phoneText.match(/^(\+\d{1,4})[\s-]*(\d+)$/);
  if (match) {
    return {
      alertPhoneCountryCode: match[1],
      alertPhone: match[2],
    };
  }

  return {
    alertPhoneCountryCode: '+86',
    alertPhone: phoneText.replace(/\s+/g, ''),
  };
};

const isValidEmail = (value) => {
  const email = String(value || '').trim();
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const syncProfilePatchToLocalStorage = (patch) => {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem('userDataInfo');
    const parsed = raw ? JSON.parse(raw) : {};
    const next = {
      ...parsed,
      ...patch,
      userInfo: {
        ...(parsed.userInfo || {}),
        ...(patch.introduction != null ? { introduction: patch.introduction } : {}),
        ...(patch.identityTag != null ? { identityTag: patch.identityTag } : {}),
        ...(patch.tronUsdtAddress != null ? { tronUsdtAddress: patch.tronUsdtAddress } : {}),
        ...(patch.alertEmail != null ? { alertEmail: patch.alertEmail } : {}),
        ...(patch.alertPhone != null ? { alertPhone: patch.alertPhone } : {}),
        ...(patch.alertPhoneCountryCode != null
          ? { alertPhoneCountryCode: patch.alertPhoneCountryCode }
          : {}),
      },
    };
    localStorage.setItem('userDataInfo', JSON.stringify(next));
  } catch (error) {
    console.error('[UserProfilePanelPopup] sync userDataInfo failed:', error);
  }
};

const COMMISSION_SAVE_DEBOUNCE_MS = 500;
const FIELD_SAVE_DEBOUNCE_MS = 600;

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
    () => {
      const bio = sanitizeProfileText(initialData?.bio || initialData?.account, [t('user.defaultBio')]);
      return {
        name: sanitizeProfileText(initialData?.name),
        account: bio,
        bio,
        email: sanitizeProfileText(initialData?.email),
        phone: sanitizeProfileText(initialData?.phone),
        commission: sanitizeProfileText(initialData?.commission),
        avatar: initialData?.avatar || DEFAULT_AVATAR,
        boundTelegram: initialData?.boundTelegram ?? false,
        boundWallet: initialData?.boundWallet ?? false,
        language: initialData?.language || ((i18n?.language || '').startsWith('en') ? 'English' : '中文（中国）'),
        selectedTagId: resolveTagId(initialData?.selectedTagId || initialData?.selectedTag),
        userId: resolveCurrentUserId(initialData?.userId, initialData?.id),
      };
    },
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
  const [isProfileReady, setIsProfileReady] = useState(false);
  const selectedTagLabel = selectedTagId
    ? t(`editProfile.identity.options.${selectedTagId}`)
    : t('editProfile.identity.placeholder');
  const currentLng = selectedLanguage === 'English' ? 'en' : 'zh';
  const commissionSaveTimerRef = useRef(null);
  const fieldSaveTimerRef = useRef(null);
  const isEditingFieldRef = useRef(false);
  const lastSavedCommissionRef = useRef((data.commission || '').trim());
  const lastSavedBioRef = useRef((data.bio || '').trim());
  const lastSavedEmailRef = useRef((data.email || '').trim());
  const lastSavedPhoneRef = useRef((data.phone || '').trim());
  const lastSavedTagRef = useRef(data.selectedTagId);
  const dataRef = useRef(data);
  dataRef.current = data;
  const tRef = useRef(t);
  tRef.current = t;

  const applyMappedProfile = useCallback((mapped, { resetSaved = true } = {}) => {
    if (isEditingFieldRef.current) return;
    setProfileData(mapped);
    setSelectedTagId(mapped.selectedTagId);
    setBio(mapped.bio);
    setEmail(mapped.email);
    setPhone(mapped.phone);
    setCommission(mapped.commission);
    if (resetSaved) {
      lastSavedCommissionRef.current = (mapped.commission || '').trim();
      lastSavedBioRef.current = (mapped.bio || '').trim();
      lastSavedEmailRef.current = (mapped.email || '').trim();
      lastSavedPhoneRef.current = (mapped.phone || '').trim();
      lastSavedTagRef.current = mapped.selectedTagId;
    }
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    let cancelled = false;
    isEditingFieldRef.current = false;

    const applySeed = (seed) => {
      setProfileData(seed);
      setSelectedTagId(seed.selectedTagId);
      setSelectedLanguage(seed.language);
      setBio(seed.bio);
      setEmail(seed.email);
      setPhone(seed.phone);
      setCommission(seed.commission);
      lastSavedCommissionRef.current = (seed.commission || '').trim();
      lastSavedBioRef.current = (seed.bio || '').trim();
      lastSavedEmailRef.current = (seed.email || '').trim();
      lastSavedPhoneRef.current = (seed.phone || '').trim();
      lastSavedTagRef.current = seed.selectedTagId;
    };

    applySeed(dataRef.current);

    const hydrateFromLocal = () => {
      try {
        const raw = localStorage.getItem('userDataInfo');
        if (!raw) return false;
        const parsed = JSON.parse(raw);
        const normalized = parsed?.data && typeof parsed.data === 'object' ? parsed.data : parsed;
        const mapped = mapDatainfoToPopupData(normalized, dataRef.current, tRef.current);
        if (cancelled) return false;
        applyMappedProfile(mapped);
        return true;
      } catch (error) {
        console.error('[UserProfilePanelPopup] parse local userDataInfo failed:', error);
        return false;
      }
    };

    const fetchDatainfo = async () => {
      try {
        const res = await getUserDataInfo();
        if (cancelled) return;
        if (res?.data) {
          const mapped = mapDatainfoToPopupData(res.data, dataRef.current, tRef.current);
          applyMappedProfile(mapped);
          localStorage.setItem('userDataInfo', JSON.stringify(res.data));
        }
      } catch (error) {
        console.error('[UserProfilePanelPopup] fetch user datainfo failed:', error);
      } finally {
        if (!cancelled) setIsProfileReady(true);
      }
    };

    if (hydrateFromLocal()) {
      setIsProfileReady(true);
    } else {
      setIsProfileReady(false);
    }
    fetchDatainfo();

    return () => {
      cancelled = true;
    };
  }, [open, applyMappedProfile]);

  const persistProfile = useCallback(async (patch, { silent = false } = {}) => {
    if (typeof window !== 'undefined' && !localStorage.getItem('token')) {
      if (!silent) message.warning(t('oneClickAlarm.pleaseLogin'));
      return false;
    }

    const nextBio = 'bio' in patch ? String(patch.bio ?? '').trim() : lastSavedBioRef.current;
    const nextEmail = 'email' in patch ? String(patch.email ?? '').trim() : lastSavedEmailRef.current;
    const nextPhone = 'phone' in patch ? String(patch.phone ?? '').trim() : lastSavedPhoneRef.current;
    const nextTagId = 'tagId' in patch ? patch.tagId : lastSavedTagRef.current;
    const nextCommission = 'commission' in patch
      ? String(patch.commission ?? '').trim()
      : lastSavedCommissionRef.current;

    if ('email' in patch && !isValidEmail(nextEmail)) {
      message.error(t('oneClickAlarm.emailInvalid'));
      return false;
    }

    const unchanged =
      nextBio === lastSavedBioRef.current &&
      nextEmail === lastSavedEmailRef.current &&
      nextPhone === lastSavedPhoneRef.current &&
      nextTagId === lastSavedTagRef.current &&
      nextCommission === lastSavedCommissionRef.current;
    if (unchanged) return true;

    const phoneParts = parsePhoneParts(nextPhone);
    const storedThemeColor = Number(localStorage.getItem('themeColor') || 0);
    const payload = {
      nickName: profileData?.name || '',
      avatar: profileData?.avatar || '',
      identityTag: nextTagId ? t(`editProfile.identity.options.${nextTagId}`) : '',
      introduction: nextBio,
      tronUsdtAddress: nextCommission,
      language: (i18n?.language || 'zh').startsWith('en') ? 'en' : 'zh',
      themeColor: Number.isFinite(storedThemeColor) ? storedThemeColor : 0,
      alertPhone: phoneParts.alertPhone,
      alertPhoneCountryCode: phoneParts.alertPhone ? phoneParts.alertPhoneCountryCode : '',
      alertEmail: nextEmail,
    };

    try {
      const res = await updateUserInfo(payload);
      const ok =
        res == null ||
        res?.code === 200 ||
        res?.code === 0 ||
        res?.success === true ||
        (res && res.code == null && res.success == null);

      if (!ok) {
        message.error(res?.msg || res?.message || t('editProfile.saveFailed'));
        return false;
      }

      lastSavedBioRef.current = nextBio;
      lastSavedEmailRef.current = nextEmail;
      lastSavedPhoneRef.current = nextPhone;
      lastSavedTagRef.current = nextTagId;
      lastSavedCommissionRef.current = nextCommission;
      setProfileData((prev) => ({
        ...prev,
        bio: nextBio,
        account: nextBio || prev.account,
        email: nextEmail,
        phone: nextPhone,
        commission: nextCommission,
        selectedTagId: nextTagId,
      }));

      syncProfilePatchToLocalStorage(payload);
      try {
        await completeTask('COMPLETE_PROFILE');
      } catch (_) {}

      if (!silent) message.success(t('editProfile.saveSuccess'));
      return true;
    } catch (error) {
      console.error('[UserProfilePanelPopup] update user info failed:', error);
      message.error(t('editProfile.saveFailedRetry'));
      return false;
    }
  }, [t, i18n?.language, profileData?.name, profileData?.avatar]);

  const persistCommission = useCallback(
    (value) => persistProfile({ commission: value }, { silent: true }),
    [persistProfile]
  );

  const scheduleFieldSave = useCallback(
    (patch) => {
      if (fieldSaveTimerRef.current) {
        clearTimeout(fieldSaveTimerRef.current);
      }
      fieldSaveTimerRef.current = setTimeout(async () => {
        fieldSaveTimerRef.current = null;
        const ok = await persistProfile(patch, { silent: true });
        if (ok) {
          isEditingFieldRef.current = false;
        }
      }, FIELD_SAVE_DEBOUNCE_MS);
    },
    [persistProfile]
  );

  const handleBioChange = useCallback(
    (e) => {
      const next = e.target.value;
      isEditingFieldRef.current = true;
      setBio(next);
      scheduleFieldSave({ bio: next });
    },
    [scheduleFieldSave]
  );

  const handleEmailChange = useCallback(
    (e) => {
      const next = e.target.value;
      isEditingFieldRef.current = true;
      setEmail(next);
      scheduleFieldSave({ email: next });
    },
    [scheduleFieldSave]
  );

  const handlePhoneChange = useCallback(
    (e) => {
      const next = e.target.value;
      isEditingFieldRef.current = true;
      setPhone(next);
      scheduleFieldSave({ phone: next });
    },
    [scheduleFieldSave]
  );

  const flushPendingSaves = useCallback(() => {
    if (commissionSaveTimerRef.current) {
      clearTimeout(commissionSaveTimerRef.current);
      commissionSaveTimerRef.current = null;
    }
    if (fieldSaveTimerRef.current) {
      clearTimeout(fieldSaveTimerRef.current);
      fieldSaveTimerRef.current = null;
    }
    isEditingFieldRef.current = false;
    persistProfile(
      {
        bio,
        email,
        phone,
        tagId: selectedTagId,
        commission,
      },
      { silent: true }
    );
  }, [bio, email, phone, selectedTagId, commission, persistProfile]);

  const handleSelectTag = useCallback(
    (tagId) => {
      setSelectedTagId(tagId);
      persistProfile({ tagId });
    },
    [persistProfile]
  );

  const handleClose = useCallback(() => {
    flushPendingSaves();
    onClose?.();
  }, [flushPendingSaves, onClose]);

  const handleCommissionChange = useCallback(
    (e) => {
      const next = e.target.value;
      isEditingFieldRef.current = true;
      setCommission(next);

      if (commissionSaveTimerRef.current) {
        clearTimeout(commissionSaveTimerRef.current);
      }

      commissionSaveTimerRef.current = setTimeout(async () => {
        commissionSaveTimerRef.current = null;
        const ok = await persistCommission(next);
        if (ok) {
          isEditingFieldRef.current = false;
        }
      }, COMMISSION_SAVE_DEBOUNCE_MS);
    },
    [persistCommission]
  );

  useEffect(
    () => () => {
      if (commissionSaveTimerRef.current) {
        clearTimeout(commissionSaveTimerRef.current);
      }
      if (fieldSaveTimerRef.current) {
        clearTimeout(fieldSaveTimerRef.current);
      }
    },
    []
  );

  const handleSwitchTheme = () => {
    handleClose();
    router.push('/theme');
  };

  const handleViewChannel = () => {
    const userId = resolveCurrentUserId(profileData?.userId);
    if (!userId) return;
    handleClose();
    router.push(`/user/${encodeURIComponent(userId)}`);
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
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.floatingPanel} onClick={(e) => e.stopPropagation()}>
      <div className={styles.panel}>
        <div className={styles.headerCard}>
          <img src={profileData.avatar || DEFAULT_AVATAR} alt={profileData.name || ''} className={styles.avatar} />
          <div className={styles.headerRight}>
            <div className={styles.name}>
              {profileData.name
                ? profileData.name
                : isProfileReady
                  ? t('user.defaultNickname')
                  : <span className={styles.skeletonText} style={{ width: '42%' }} />}
            </div>
            <div className={`${styles.account} ${isProfileReady && !profileData.account ? styles.placeholderText : ''}`}>
              {isProfileReady
                ? (profileData.account || t('editProfile.bio.placeholder'))
                : <span className={styles.skeletonText} style={{ width: '78%' }} />}
            </div>
            <button type="button" className={styles.channelBtn} onClick={handleViewChannel}>
              {t('user.profilePanel.viewChannel')}
            </button>
          </div>
        </div>

        <div className={styles.sectionCard}>
          <div className={styles.bindRow}>
            <div className={styles.bindLeft}>
              <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/pc/bind_telegram.svg" alt="" />
              <span>{t('user.profilePanel.telegram')}</span>
            </div>
            {isProfileReady ? (
              <button
                type="button"
                className={profileData.boundTelegram ? styles.boundBtn : styles.unboundBtn}
                onClick={() => onBindBenefitCode?.()}
              >
                {profileData.boundTelegram ? t('user.profilePanel.bound') : t('user.profilePanel.bind')}
              </button>
            ) : (
              <span className={styles.skeletonBtn} />
            )}
          </div>
        </div>

        <div className={styles.sectionCard}>
          <div
            className={styles.labelRow}
            onClick={() => isProfileReady && setTagExpanded((prev) => !prev)}
          >
            <div className={styles.labelTitle}>
              <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/new_user/user_tag_90A1B9.svg" alt="" />
              <div>
                <div className={styles.labelMain}>{t('editProfile.identity.label')}</div>
                {isProfileReady ? (
                  <div className={`${styles.labelSub} ${!selectedTagId ? styles.placeholderText : ''}`}>
                    {selectedTagLabel}
                  </div>
                ) : (
                  <span className={styles.skeletonText} style={{ width: '46%' }} />
                )}
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
                  onClick={() => handleSelectTag(tag.id)}
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
            <div
              className={styles.formField}
              onClick={(e) => e.currentTarget.querySelector('input')?.focus()}
            >
              <div className={styles.formLabel}>{t('editProfile.bio.label')}</div>
              {isProfileReady ? (
                <input
                  type="text"
                  value={bio}
                  onChange={handleBioChange}
                  placeholder={t('editProfile.bio.placeholder')}
                />
              ) : (
                <span className={styles.skeletonText} />
              )}
            </div>
          </div>
          <div className={styles.formRow}>
            <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/pc/email.svg" alt="" />
            <div
              className={styles.formField}
              onClick={(e) => e.currentTarget.querySelector('input')?.focus()}
            >
              <div className={styles.formLabel}>{t('editProfile.email.label')}</div>
              {isProfileReady ? (
                <input
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  placeholder={t('editProfile.email.placeholder')}
                />
              ) : (
                <span className={styles.skeletonText} />
              )}
            </div>
          </div>
          <div className={styles.formRow}>
            <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/pc/phone.svg" alt="" />
            <div
              className={styles.formField}
              onClick={(e) => e.currentTarget.querySelector('input')?.focus()}
            >
              <div className={styles.formLabel}>{t('editProfile.phone.label')}</div>
              {isProfileReady ? (
                <input
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder={t('editProfile.phone.placeholder')}
                />
              ) : (
                <span className={styles.skeletonText} />
              )}
            </div>
          </div>
          <div className={styles.formRow}>
            <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/pc/earn.svg" alt="" />
            <div
              className={styles.formField}
              onClick={(e) => e.currentTarget.querySelector('input')?.focus()}
            >
              <div className={styles.formLabel}>{t('editProfile.commission.label')}</div>
              {isProfileReady ? (
                <input
                  value={commission}
                  onChange={handleCommissionChange}
                  placeholder={t('editProfile.commission.placeholder')}
                />
              ) : (
                <span className={styles.skeletonText} />
              )}
            </div>
          </div>
        </div>

        <div
          className={styles.logoutBtn}
          onClick={() => {
            flushPendingSaves();
            onLogout?.();
          }}
        >
          <img src="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/pc/logout.svg" alt="" className={styles.logoutIcon} />
          <span>{t('user.profilePanel.logout')}</span>
        </div>

        <div className={styles.sectionCard}>
          <div
            className={styles.bottomRow}
            onClick={() => {
              flushPendingSaves();
              onSave?.();
            }}
          >
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
                className={`${styles.languageItem} ${currentLng === 'zh' ? styles.languageItemActive : ''}`}
                onClick={() => selectLanguage('zh')}
              >
                <span>中文（中国）</span>
                {currentLng === 'zh' ? <span className={styles.check}>✓</span> : null}
              </div>
              <div
                className={`${styles.languageItem} ${currentLng === 'en' ? styles.languageItemActive : ''}`}
                onClick={() => selectLanguage('en')}
              >
                <span>English</span>
                {currentLng === 'en' ? <span className={styles.check}>✓</span> : null}
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
    </div>,
    document.body
  );
}

