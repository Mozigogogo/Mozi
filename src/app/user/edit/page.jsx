'use client';

import React, { useState, useEffect, useRef } from 'react';
import { NavBar, Toast, Button, Picker, Input } from 'antd-mobile';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { getUserDataInfo, updateUserInfo } from '@/api/user';
import styles from './page.module.less';

const DEFAULT_AVATAR = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/avatar.png';

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

export default function EditProfilePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  
  const [loading, setLoading] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [userInfo, setUserInfo] = useState({
    avatar: DEFAULT_AVATAR,
    nickName: '',
    identity: '',
    description: '',
    email: '',
    phone: '',
    commissionId: ''
  });

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

  const fetchUserInfo = async () => {
    try {
      const storedUserInfo = localStorage.getItem('userInfo');
      if (storedUserInfo) {
        const parsed = JSON.parse(storedUserInfo);
        // 这里只是模拟，实际应该从API获取完整信息
        // 假设 API 返回的字段结构需要映射到当前 state
        setUserInfo(prev => ({
          ...prev,
          avatar: parsed.avatar || DEFAULT_AVATAR,
          nickName: parsed.nickName || parsed.nickname || 'MOZI',
          // 以下字段可能需要后端支持，这里先用模拟数据或空值
          identity: parsed.identity || '',
          description: parsed.description || '',
          email: parsed.email || '',
          phone: parsed.phone || '',
          commissionId: parsed.commissionId || ''
        }));
      } else {
        // 尝试从 API 获取
        const res = await getUserDataInfo();
        if (res.code === 200) {
          const data = res.data;
          setUserInfo(prev => ({
            ...prev,
            avatar: data.avatar || DEFAULT_AVATAR,
            nickName: data.nickName || 'MOZI',
            // ...其他字段映射
          }));
        }
      }
    } catch (error) {
      console.error('Fetch user info failed:', error);
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
      // 构建提交数据
      const updateData = {
        nickName: userInfo.nickName,
        avatar: userInfo.avatar,
        // 其他字段根据 API 要求添加
        // identity: userInfo.identity,
        // description: userInfo.description,
        // ...
      };

      const res = await updateUserInfo(updateData);
      
      if (res.code === 200) {
        Toast.show({
          icon: 'success',
          content: t('editProfile.saveSuccess'),
        });
        
        // 更新本地存储
        const storedData = localStorage.getItem('userInfo');
        if (storedData) {
          const parsed = JSON.parse(storedData);
          const newData = { ...parsed, ...updateData };
          localStorage.setItem('userInfo', JSON.stringify(newData));
        }
        
        setTimeout(() => {
          router.back();
        }, 1000);
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
      </div>

      <div className={styles.formCard}>
        {/* 身份标签 */}
        <div className={styles.formItem} onClick={() => setIdentityPickerVisible(true)}>
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
