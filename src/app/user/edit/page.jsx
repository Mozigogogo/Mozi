'use client';

import React, { useState, useEffect, useRef } from 'react';
import { NavBar, Toast, Button, Picker, Input, TextArea } from 'antd-mobile';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { RightOutline, EditSOutline } from 'antd-mobile-icons';
import { getUserDataInfo, updateUserInfo } from '@/api/user';
import styles from './page.module.less';

const DEFAULT_AVATAR = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/avatar.png';

// 模拟图标，实际项目中请替换为真实资源
const ICONS = {
  identity: '/icons/new_user/user_tag.svg',
  bio: '/icons/new_user/user_info.svg',
  email: '/icons/new_user/email.svg',
  phone: '/icons/new_user/phone.svg',
  commission: '/icons/new_user/reward.svg'
};

export default function EditProfilePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  
  const [loading, setLoading] = useState(false);
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
    { label: '内容创作者', value: 'creator' },
    { label: '投资者', value: 'investor' },
    { label: '分析师', value: 'analyst' },
    { label: '普通用户', value: 'user' },
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
          identity: parsed.identity || 'creator',
          description: parsed.description || '资金流动大师，金融NO.1',
          email: parsed.email || 'carlakorsgaard@gmail.com',
          phone: parsed.phone || '+8234567900',
          commissionId: parsed.commissionId || 'TronUSDTbinubho'
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
      Toast.show({ content: '图片大小不能超过 5MB' });
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
          content: '保存成功',
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
          content: res.msg || '保存失败',
        });
      }
    } catch (error) {
      console.error('Update failed:', error);
      Toast.show({
        icon: 'fail',
        content: '保存失败，请重试',
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
        编辑资料
      </NavBar>

      <div className={styles.headerSection}>
        <div className={styles.avatarWrapper} onClick={handleAvatarClick}>
          <img src={userInfo.avatar} alt="avatar" className={styles.avatar} />
          <input 
            type="file" 
            ref={fileInputRef} 
            accept="image/*" 
            style={{ display: 'none' }} 
            onChange={handleFileChange} 
          />
        </div>
        
        <div className={styles.nicknameWrapper}>
          <input 
            className={styles.nicknameInput} 
            value={userInfo.nickName}
            onChange={(e) => setUserInfo({...userInfo, nickName: e.target.value})}
            style={{ 
              border: 'none', 
              background: 'transparent', 
              textAlign: 'center',
              fontSize: '20px',
              fontWeight: 700,
              width: 'auto',
              maxWidth: '200px'
            }}
          />
          <EditSOutline className={styles.editNameIcon} />
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
            <div className={styles.label}>身份标签</div>
            <div className={styles.valueWrapper}>
              <span className={styles.value}>{getIdentityLabel(userInfo.identity) || '请选择'}</span>
              <RightOutline className={styles.arrow} />
            </div>
          </div>
        </div>

        {/* 个人简介 */}
        <div className={styles.formItem}>
          <div className={styles.iconWrapper}>
            <img src={ICONS.bio} alt="bio" />
          </div>
          <div className={styles.itemContent}>
            <div className={styles.label}>个人简介</div>
            <div className={styles.valueWrapper}>
              <TextArea
                placeholder="请输入个人简介"
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
            <div className={styles.label}>告警邮件</div>
            <div className={styles.valueWrapper}>
              <Input
                placeholder="请输入邮箱"
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
            <div className={styles.label}>告警电话</div>
            <div className={styles.valueWrapper}>
              <Input
                placeholder="请输入电话"
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
            <div className={styles.label}>获取分佣</div>
            <div className={styles.valueWrapper}>
              <Input
                placeholder="分佣ID"
                value={userInfo.commissionId}
                onChange={val => setUserInfo({...userInfo, commissionId: val})}
                className={styles.input}
                readOnly // 假设这个是只读的
              />
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
          保存
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
