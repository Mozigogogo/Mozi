'use client';

import React, { useState, useEffect, useRef } from 'react';
import { NavBar, Toast, Button, Picker, Input } from 'antd-mobile';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { getUserDataInfo, updateUserInfo, completeTask } from '@/api/user';
import { getMySubscription } from '@/api/vip';
import VipBanner from '@/components/VipBanner';
import styles from './page.module.less';

const DEFAULT_AVATAR = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/avatar.png';

/**与「我的」页、postLogin 共用的 datainfo 本地缓存键 */
const USER_DATA_INFO_STORAGE_KEY = 'userDataInfo';

/**
 * 解析 GET /user/datainfo 体（兼容 { code, data }、双层 data、扁平结构）
 * @param {unknown} res
 * @returns {object|null}
 */
function normalizeDatainfoPayload(res) {
  if (res == null || typeof res !== 'object') return null;
  let p = res.data;
  if (p && typeof p === 'object' && p.data && typeof p.data === 'object' && !Array.isArray(p.data)) {
    p = p.data;
  }
  if (p && typeof p === 'object' && !Array.isArray(p)) {
    return p;
  }
  if (res.userId != null || res.totalPoints != null || res.followingCount != null) {
    return res;
  }
  return null;
}

/**
 * 判断本地 datainfo 是否属于当前登录用户
 * @param {object|null|undefined} data
 * @returns {boolean}
 */
function isUserDataInfoForCurrentUser(data) {
  if (!data) return false;
  if (typeof window === 'undefined') return true;
  try {
    const storedUserId = localStorage.getItem('userId');
    if (!storedUserId) return true;
    const cacheUserId = data.userId ?? data.userInfo?.userId ?? data.userInfo?.id;
    if (cacheUserId == null || String(cacheUserId).trim() === '') return true;
    return String(cacheUserId) === String(storedUserId);
  } catch {
    return false;
  }
}

/**
 * 从 localStorage 读取并校验后的 datainfo
 * @param {string|null|undefined} rawJson
 * @returns {object|null}
 */
function parseStoredUserDataInfo(rawJson) {
  if (!rawJson) return null;
  try {
    const parsed = JSON.parse(rawJson);
    const data =
      normalizeDatainfoPayload(parsed) ??
      (parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null);
    if (!data || !isUserDataInfoForCurrentUser(data)) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * 依次取第一个非空字符串（避免 `alertPhone: ""` 挡住后面的 `phoneNumber`）
 * @param {...unknown} vals
 * @returns {string}
 */
function pickFirstNonEmptyString(...vals) {
  for (const v of vals) {
    if (v == null) continue;
    const s = String(v).trim();
    if (s !== '') return s;
  }
  return '';
}

/**
 * 将 datainfo 映射为编辑资料表单 state
 * @param {object} data
 * @returns {{ avatar: string, nickName: string, identity: string, description: string, email: string, phone: string, commissionId: string }}
 */
function mapDatainfoToEditForm(data) {
  const u = data?.userInfo && typeof data.userInfo === 'object' ? data.userInfo : {};
  const nickName = String(u.nickName || data.nickName || data.nickname || '').trim();
  const avatar = u.avatar || data.avatar || DEFAULT_AVATAR;
  let identity = String(data.identityTag ?? u.identityTag ?? '').trim();
  if (identity.includes(',') || identity.includes('，')) {
    identity = identity.split(/[,，]/)[0].trim();
  }
  const description = String(data.introduction ?? u.introduction ?? '').trim();
  const email = pickFirstNonEmptyString(
    data.alertEmail,
    u.alertEmail,
    data.email,
    u.email
  );
  const ap = pickFirstNonEmptyString(
    data.alertPhone,
    u.alertPhone,
    data.phoneNumber,
    u.phoneNumber,
    data.phone,
    u.phone
  );
  const apc = pickFirstNonEmptyString(data.alertPhoneCountryCode, u.alertPhoneCountryCode);
  let phone = '';
  if (ap) {
    if (/^\+\d/.test(ap)) {
      phone = ap;
    } else {
      phone = apc ? `${apc} ${ap}`.trim() : ap;
    }
  }
  const commissionId = pickFirstNonEmptyString(
    data.tronUsdtAddress,
    u.tronUsdtAddress,
    data.commissionId,
    u.commissionId
  );

  return {
    avatar: avatar || DEFAULT_AVATAR,
    nickName: nickName || 'MOZI',
    identity,
    description,
    email,
    phone,
    commissionId,
  };
}

/**
 * 用于对比缓存与接口是否需要刷新表单
 * @param {ReturnType<typeof mapDatainfoToEditForm>} patch
 * @param {string|null} identityOverride - URL / session 待写入的身份，优先参与签名
 * @returns {string}
 */
function buildEditFormSignature(patch, identityOverride) {
  const id = (identityOverride || patch.identity || '').trim();
  return JSON.stringify({
    avatar: patch.avatar,
    nickName: patch.nickName,
    identity: id,
    description: patch.description,
    email: patch.email,
    phone: patch.phone,
    commissionId: patch.commissionId,
  });
}

// 模拟图标，实际项目中请替换为真实资源
const ICONS = {
  identity: '/icons/new_user/user_tag.svg',
  bio: '/icons/new_user/user_info.svg',
  email: '/icons/new_user/email.svg',
  phone: '/icons/new_user/phone.svg',
  commission: '/icons/new_user/reward.svg',
  edit: '/icons/new_user/edit.svg',
  upload: '/icons/new_user/upload_image.svg',
  right: '/icons/new_user/right.svg'
};

const PENDING_IDENTITY_KEY = 'mozi_pending_profile_identity';

export default function EditProfilePage() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const fileInputRef = useRef(null);
  
  const [loading, setLoading] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [mySubscription, setMySubscription] = useState(null);
  const [userInfo, setUserInfo] = useState({
    avatar: DEFAULT_AVATAR,
    nickName: '',
    identity: '',
    description: '',
    email: '',
    phone: '',
    commissionId: ''
  });

  const parsePhoneParts = (rawPhone) => {
    const phoneText = String(rawPhone || '').trim();
    if (!phoneText) {
      return { alertPhone: '', alertPhoneCountryCode: '' };
    }

    // 支持 "+86 13800138000" / "+8613800138000" / "13800138000"
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

  // 身份标签选项
  const identityOptions = [[
    { label: t('editProfile.identity.options.compliance'), value: 'compliance' },
    { label: t('editProfile.identity.options.trader'), value: 'trader' },
    { label: t('editProfile.identity.options.quant'), value: 'quant' },
    { label: t('editProfile.identity.options.creator'), value: 'creator' },
    { label: t('editProfile.identity.options.community_builder'), value: 'community_builder' },
    { label: t('editProfile.identity.options.institution'), value: 'institution' },
    { label: t('editProfile.identity.options.project_member'), value: 'project_member' },
    { label: t('editProfile.identity.options.researcher'), value: 'researcher' },
    { label: t('editProfile.identity.options.educator'), value: 'educator' },
    { label: t('editProfile.identity.options.retail'), value: 'retail' },
  ]];
  const [identityPickerVisible, setIdentityPickerVisible] = useState(false);

  useEffect(() => {
    fetchUserInfo();
  }, []);

  /** 从身份选择页返回时 URL 带 ?identity=xxx；必须在 fetchUserInfo 合并后再写入，否则会被 localStorage/API 覆盖导致无法回显 */
  const stripIdentityQuery = () => {
    if (typeof window === 'undefined') return;
    try {
      const url = new URL(window.location.href);
      if (!url.searchParams.has('identity')) return;
      url.searchParams.delete('identity');
      window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('token');
    if (!token) return;

    let alive = true;
    getMySubscription()
      .then((res) => {
        if (!alive) return;
        const data = res?.data ?? res;
        setMySubscription(data);
      })
      .catch(() => {
        // 静默失败：不影响编辑资料
      });
    return () => {
      alive = false;
    };
  }, []);

  const clearPendingIdentityStorage = () => {
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(PENDING_IDENTITY_KEY);
      }
    } catch {
      /* ignore */
    }
  };

  const fetchUserInfo = async () => {
    let identityPending = null;
    try {
      if (typeof sessionStorage !== 'undefined') {
        identityPending = sessionStorage.getItem(PENDING_IDENTITY_KEY);
      }
    } catch {
      /* ignore */
    }

    const identityFromUrl =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('identity')
        : null;

    /** 来自身份页的选择（session 或 URL），需优先于缓存与接口 */
    const identityIncoming = identityPending || identityFromUrl;

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    const applyIdentityIncomingCleanup = () => {
      if (!identityIncoming) return;
      clearPendingIdentityStorage();
      stripIdentityQuery();
    };

    /**
     * 无 userDataInfo 时用 userInfo 兜底（旧逻辑兼容）
     * @param {object} parsed
     * @returns {void}
     */
    const mergeFromParsedUserInfo = (parsed) => {
      const pPhone = pickFirstNonEmptyString(
        parsed.alertPhone,
        parsed.phone,
        parsed.phoneNumber
      );
      const pApc = pickFirstNonEmptyString(parsed.alertPhoneCountryCode);
      let phoneDisplay = '';
      if (pPhone) {
        phoneDisplay = /^\+\d/.test(pPhone)
          ? pPhone
          : pApc
            ? `${pApc} ${pPhone}`.trim()
            : pPhone;
      }
      setUserInfo((prev) => ({
        ...prev,
        avatar: parsed.avatar || prev.avatar || DEFAULT_AVATAR,
        nickName: parsed.nickName || parsed.nickname || prev.nickName || 'MOZI',
        identity: identityIncoming || parsed.identityTag || parsed.identity || prev.identity || '',
        description: parsed.introduction || parsed.description || prev.description || '',
        email:
          pickFirstNonEmptyString(parsed.alertEmail, parsed.email, prev.email) ||
          '',
        phone: phoneDisplay || prev.phone || '',
        commissionId: pickFirstNonEmptyString(
          parsed.tronUsdtAddress,
          parsed.commissionId,
          prev.commissionId
        ),
      }));
    };

    let cachedSig = '';

    try {
      // 1) userDataInfo 缓存优先回显（与 /user 一致）
      if (token) {
        const cachedData = parseStoredUserDataInfo(localStorage.getItem(USER_DATA_INFO_STORAGE_KEY));
        if (cachedData) {
          const patch = mapDatainfoToEditForm(cachedData);
          cachedSig = buildEditFormSignature(patch, identityIncoming);
          setUserInfo((prev) => ({
            ...prev,
            ...patch,
            identity: identityIncoming || patch.identity || prev.identity || '',
          }));
          applyIdentityIncomingCleanup();
        }
      }

      // 2) 尚无 datainfo 缓存时用 userInfo 兜底
      if (token) {
        const hasDatainfo = !!parseStoredUserDataInfo(localStorage.getItem(USER_DATA_INFO_STORAGE_KEY));
        if (!hasDatainfo) {
          const storedUserInfo = localStorage.getItem('userInfo');
          if (storedUserInfo) {
            const parsed = JSON.parse(storedUserInfo);
            mergeFromParsedUserInfo(parsed);
            applyIdentityIncomingCleanup();
          }
        }
      }

      // 3) 已登录则始终拉取最新 datainfo，与缓存比较后再更新表单与 localStorage
      if (!token) {
        if (identityIncoming) {
          setUserInfo((prev) => ({ ...prev, identity: identityIncoming || prev.identity }));
          applyIdentityIncomingCleanup();
        }
        return;
      }

      const res = await getUserDataInfo();
      if (!(res.code === 200 || res.code === 0 || res.success)) {
        if (identityIncoming) {
          setUserInfo((prev) => ({ ...prev, identity: identityIncoming || prev.identity }));
          applyIdentityIncomingCleanup();
        }
        return;
      }

      const data = normalizeDatainfoPayload(res) ?? res.data;
      if (!data || typeof data !== 'object') {
        if (identityIncoming) {
          setUserInfo((prev) => ({ ...prev, identity: identityIncoming || prev.identity }));
          applyIdentityIncomingCleanup();
        }
        return;
      }

      try {
        localStorage.setItem(USER_DATA_INFO_STORAGE_KEY, JSON.stringify(data));
      } catch (e) {
        console.error('同步 userDataInfo 失败:', e);
      }

      const patch = mapDatainfoToEditForm(data);
      const freshSig = buildEditFormSignature(patch, identityIncoming);
      if (freshSig !== cachedSig) {
        setUserInfo((prev) => ({
          ...prev,
          ...patch,
          identity: identityIncoming || patch.identity || prev.identity || '',
        }));
      }
      applyIdentityIncomingCleanup();
    } catch (error) {
      console.error('Fetch user info failed:', error);
      if (identityIncoming) {
        setUserInfo((prev) => ({ ...prev, identity: identityIncoming || prev.identity }));
        applyIdentityIncomingCleanup();
      }
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      Toast.show({ content: t('editProfile.imageSizeLimit') });
      return;
    }

    // 预览
    const reader = new FileReader();
    reader.onload = (e) => {
      setUserInfo(prev => ({ ...prev, avatar: e.target.result }));
    };
    reader.readAsDataURL(file);
    
    // 这里应该上传图片到服务器，获取URL
    // 为了演示，这里假设已经上传成功
    // const formData = new FormData();
    // formData.append('file', file);
    // const uploadRes = await uploadImage(formData);
    // setUserInfo(prev => ({ ...prev, avatar: uploadRes.url }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { alertPhone, alertPhoneCountryCode } = parsePhoneParts(userInfo.phone);
      const normalizedLanguage = (i18n?.language || 'zh').startsWith('en') ? 'en' : 'zh';
      const storedThemeColor =
        typeof window !== 'undefined'
          ? Number(localStorage.getItem('themeColor') || 0)
          : 0;

      // 构建提交数据（/user/info）
      const updateData = {
        nickName: (userInfo.nickName || '').trim(),
        avatar: userInfo.avatar || '',
        identityTag: getIdentityLabel(userInfo.identity || ''),
        introduction: (userInfo.description || '').trim(),
        tronUsdtAddress: (userInfo.commissionId || '').trim(),
        language: normalizedLanguage,
        themeColor: Number.isFinite(storedThemeColor) ? storedThemeColor : 0,
        alertPhone: alertPhone,
        alertPhoneCountryCode: alertPhone ? alertPhoneCountryCode : '',
        alertEmail: (userInfo.email || '').trim(),
      };

      const res = await updateUserInfo(updateData);

      if (res.code === 200 || res.code === 0 || res.success) {
        Toast.show({
          icon: 'success',
          content: t('editProfile.saveSuccess'),
        });

        // 更新本地存储
        const storedData = localStorage.getItem('userInfo');
        if (storedData) {
          const parsed = JSON.parse(storedData);
          const newData = {
            ...parsed,
            ...updateData,
            ...(userInfo.identity ? { identity: userInfo.identity } : {}),
          };
          localStorage.setItem('userInfo', JSON.stringify(newData));
        }

        try {
          const rawDataInfo = localStorage.getItem(USER_DATA_INFO_STORAGE_KEY);
          const dataInfoObj = rawDataInfo ? JSON.parse(rawDataInfo) : {};
          const nextDataInfo = {
            ...dataInfoObj,
            identityTag: updateData.identityTag,
            introduction: updateData.introduction,
            tronUsdtAddress: updateData.tronUsdtAddress,
            alertEmail: updateData.alertEmail,
            alertPhone: updateData.alertPhone,
            alertPhoneCountryCode: updateData.alertPhoneCountryCode,
            language: updateData.language,
            themeColor: updateData.themeColor,
            userInfo: {
              ...(dataInfoObj.userInfo || {}),
              nickName: updateData.nickName,
              avatar: updateData.avatar,
            },
          };
          localStorage.setItem(USER_DATA_INFO_STORAGE_KEY, JSON.stringify(nextDataInfo));
        } catch (e) {
          console.error('同步 userDataInfo 失败:', e);
        }
        
        // 完善个人信息任务上报
        try {
          await completeTask('COMPLETE_PROFILE');
        } catch (taskError) {
          console.error('完善个人信息任务上报失败:', taskError);
        }

        // 保存成功后停留在当前页，避免因历史栈回退到身份选择页
      } else {
        Toast.show({
          icon: 'fail',
          content: res.msg || t('editProfile.saveFailed'),
        });
      }
    } catch (error) {
      console.error('Update failed:', error);
      Toast.show({
        icon: 'fail',
        content: t('editProfile.saveFailedRetry'),
      });
    } finally {
      setLoading(false);
    }
  };

  const getIdentityLabel = (val) => {
    const option = identityOptions[0].find(opt => opt.value === val);
    return option ? option.label : val;
  };

  return (
    <div className={styles.container}>
      <NavBar 
        onBack={() => router.back()}
        className={styles.navBar}
      >
        {t('editProfile.title')}
      </NavBar>

      <div className={styles.scrollableContent}>
        <div className={styles.headerSection}>
          <div className={styles.avatarWrapper} onClick={handleAvatarClick}>
            <img src={userInfo.avatar} alt="avatar" className={styles.avatar} />
          <img src={ICONS.upload} alt="upload" className={styles.uploadIcon} />
          <input 
            type="file" 
            ref={fileInputRef} 
            accept="image/*" 
            style={{ display: 'none' }} 
            onChange={handleFileChange} 
          />
        </div>
        
        <div className={styles.nicknameWrapper}>
          {isEditingName ? (
            <input 
              className={styles.nicknameInput} 
              value={userInfo.nickName}
              onChange={(e) => setUserInfo({...userInfo, nickName: e.target.value})}
              onBlur={() => setIsEditingName(false)}
              autoFocus
              style={{ 
                border: 'none', 
                background: 'transparent', 
                textAlign: 'center',
                fontSize: '20px',
                fontWeight: 700,
                width: 'auto',
                maxWidth: '200px',
                padding: 0
              }}
            />
          ) : (
            <span 
              className={styles.nickname}
              style={{
                fontSize: '20px',
                fontWeight: 700,
                lineHeight: 'normal',
                display: 'inline-block'
              }}
            >
              {userInfo.nickName}
            </span>
          )}
          <img 
            src={ICONS.edit} 
            alt="edit" 
            className={styles.editNameIcon} 
            onClick={() => setIsEditingName(true)}
          />
        </div>

        <div className={styles.vipBannerWrapper}>
          <VipBanner onClick={() => router.push('/vip-recharge')} planCode={mySubscription?.planCode} />
        </div>
      </div>

      <div className={styles.formCard}>
        {/* 身份标签 */}
        <div
          className={styles.formItem}
          onClick={() => router.push(`/user/identity?value=${encodeURIComponent(userInfo.identity || '')}`)}
        >
          <div className={styles.iconWrapper}>
            {/* 使用 CSS 绘制盾牌或者使用图片 */}
            <img src={ICONS.identity} alt="identity" />
          </div>
          <div className={styles.itemContent}>
            <div className={styles.label}>{t('editProfile.identity.label')}</div>
            <div className={styles.valueWrapper}>
              <Input
                value={getIdentityLabel(userInfo.identity)}
                placeholder={t('editProfile.identity.placeholder')}
                readOnly
                className={styles.input}
                style={{ pointerEvents: 'none' }}
              />
            </div>
          </div>
          <img src={ICONS.right} alt="right" className={styles.arrow} />
        </div>

        {/* 个人简介 */}
        <div className={styles.formItem}>
          <div className={styles.iconWrapper}>
            <img src={ICONS.bio} alt="bio" />
          </div>
          <div className={styles.itemContent}>
            <div className={styles.label}>{t('editProfile.bio.label')}</div>
            <div className={styles.valueWrapper}>
              <Input
                placeholder={t('editProfile.bio.placeholder')}
                value={userInfo.description}
                onChange={val => setUserInfo({...userInfo, description: val})}
                autoSize={{ minRows: 1, maxRows: 3 }}
                className={styles.textarea}
              />
            </div>
          </div>
        </div>

        {/* 告警邮件 */}
        <div className={styles.formItem}>
          <div className={styles.iconWrapper}>
            <img src={ICONS.email} alt="email" />
          </div>
          <div className={styles.itemContent}>
            <div className={styles.label}>{t('editProfile.email.label')}</div>
            <div className={styles.valueWrapper}>
              <Input
                placeholder={t('editProfile.email.placeholder')}
                value={userInfo.email}
                onChange={val => setUserInfo({...userInfo, email: val})}
                className={styles.input}
              />
            </div>
          </div>
        </div>

        {/* 告警电话 */}
        <div className={styles.formItem}>
          <div className={styles.iconWrapper}>
            <img src={ICONS.phone} alt="phone" />
          </div>
          <div className={styles.itemContent}>
            <div className={styles.label}>{t('editProfile.phone.label')}</div>
            <div className={styles.valueWrapper}>
              <Input
                placeholder={t('editProfile.phone.placeholder')}
                value={userInfo.phone}
                onChange={val => setUserInfo({...userInfo, phone: val})}
                className={styles.input}
              />
            </div>
          </div>
        </div>

        {/* 获取分佣 */}
        <div className={styles.formItem}>
          <div className={styles.iconWrapper}>
            <img src={ICONS.commission} alt="commission" />
          </div>
          <div className={styles.itemContent}>
            <div className={styles.label}>{t('editProfile.commission.label')}</div>
            <div className={styles.valueWrapper}>
              <Input
                placeholder={t('editProfile.commission.placeholder')}
                value={userInfo.commissionId}
                onChange={val => setUserInfo({...userInfo, commissionId: val})}
                className={styles.input}
              />
            </div>
          </div>
        </div>
      </div>
      </div>

      <div className={styles.saveButtonWrapper}>
        <Button
          block
          className={styles.saveButton}
          loading={loading}
          onClick={handleSave}
        >
          {t('common.save')}
        </Button>
      </div>

      <Picker
        columns={identityOptions}
        visible={identityPickerVisible}
        onClose={() => setIdentityPickerVisible(false)}
        value={[userInfo.identity]}
        onConfirm={v => setUserInfo({...userInfo, identity: v[0]})}
      />
    </div>
  );
}
