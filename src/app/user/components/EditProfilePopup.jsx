import React, { useState, useEffect } from 'react';
import { Popup, Button, Toast } from 'antd-mobile';
import styles from '@/app/user/page.module.less';
import { updateUserInfo } from '@/api/user';

const DEFAULT_AVATAR = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/avatar.png';

const EditProfilePopup = ({ visible, onClose, t, userInfo, setUserInfo }) => {
  const [editNickname, setEditNickname] = useState('');
  const [editAvatar, setEditAvatar] = useState(DEFAULT_AVATAR);
  const [avatarFile, setAvatarFile] = useState(null);

  useEffect(() => {
    if (visible && userInfo) {
      const nickname = (userInfo.nickname && userInfo.nickname !== t('user.defaultNickname')) ? userInfo.nickname : '';
      setEditNickname(nickname);
      setEditAvatar(userInfo.avatar || DEFAULT_AVATAR);
      setAvatarFile(null);
    }
  }, [visible, userInfo, t]);

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        Toast.show({
          content: t('user.avatarTooLarge') || '头像文件太大，请选择小于2MB的图片',
          position: 'bottom',
          icon: 'fail'
        });
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        setEditAvatar(event.target.result);
        setAvatarFile(file);
      };
      reader.readAsDataURL(file);
    }
  };

  const saveUserProfile = async () => {
    if (!editNickname || editNickname.trim().length === 0) {
      Toast.show({
        content: t('user.nicknameRequired') || '请输入昵称',
        position: 'bottom',
        icon: 'fail'
      });
      return;
    }

    if (editNickname.length > 50) {
      Toast.show({
        content: t('user.nicknameTooLong') || '昵称不能超过50个字符',
        position: 'bottom',
        icon: 'fail'
      });
      return;
    }

    Toast.show({
      icon: 'loading',
      content: t('user.saving') || '保存中...',
      duration: 0
    });

    try {
      const res = await updateUserInfo({
        avatar: editAvatar,
        nickName: editNickname.trim(),
      });

      if (res?.data) {
        const newNickname = editNickname.trim();
        const newAvatar = res.data; // 服务器返回的头像URL
        
        setUserInfo(prev => ({
          ...prev,
          nickname: newNickname,
          avatar: newAvatar
        }));

        try {
          const storedUserInfo = localStorage.getItem('userInfo');
          if (storedUserInfo) {
            const parsed = JSON.parse(storedUserInfo);
            parsed.nickName = newNickname;
            parsed.avatar = newAvatar;
            localStorage.setItem('userInfo', JSON.stringify(parsed));
          } else {
            localStorage.setItem(
              'userInfo',
              JSON.stringify({
                nickName: newNickname,
                avatar: newAvatar,
              })
            );
          }
        } catch (e) {
          console.error('更新 userInfo 失败:', e);
        }
        
        try {
          const storedDataInfo = localStorage.getItem('userDataInfo');
          if (storedDataInfo) {
            const parsed = JSON.parse(storedDataInfo);
            if (!parsed.userInfo) {
              parsed.userInfo = {};
            }
            parsed.userInfo.nickName = newNickname;
            parsed.userInfo.avatar = newAvatar;
            localStorage.setItem('userDataInfo', JSON.stringify(parsed));
          }
        } catch (e) {
          console.error('更新 userDataInfo 失败:', e);
        }

        Toast.clear();
        Toast.show({
          content: t('user.saveSuccess') || '保存成功',
          position: 'center',
          icon: 'success'
        });
        onClose();
      } else {
        Toast.clear();
        Toast.show({
          content: t('user.saveFailed') || '保存失败',
          position: 'center',
          icon: 'fail'
        });
      }
    } catch (error) {
      console.error('保存用户信息失败:', error);
      Toast.clear();
      Toast.show({
        content: t('user.saveFailed') || '保存失败',
        position: 'center',
        icon: 'fail'
      });
    }
  };

  return (
    <Popup
      visible={visible}
      onMaskClick={onClose}
      onClose={onClose}
      position='bottom'
      bodyStyle={{
        borderTopLeftRadius: '24px',
        borderTopRightRadius: '24px',
        minHeight: '50vh',
        maxHeight: '80vh',
        padding: '24px'
      }}
    >
      <div className={styles.editProfileContainer}>
        <div className={styles.editProfileTitle}>{t('user.editProfile') || '编辑个人资料'}</div>
        
        {/* 头像编辑 */}
        <div className={styles.editAvatarSection}>
          <div className={styles.editLabel}>{t('user.avatar') || '头像'}</div>
          <div className={styles.editAvatarBox}>
            <img className={styles.editAvatarPreview} src={editAvatar} alt="头像预览" />
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              style={{ display: 'none' }}
              id="avatar-upload"
            />
            <label htmlFor="avatar-upload" className={styles.editAvatarBtn}>
              {t('user.changeAvatar') || '更换头像'}
            </label>
          </div>
        </div>

        {/* 昵称编辑 */}
        <div className={styles.editNicknameSection}>
          <div className={styles.editLabel}>{t('user.nickname') || '昵称'}</div>
          <input
            type="text"
            className={styles.editNicknameInput}
            value={editNickname}
            onChange={(e) => setEditNickname(e.target.value)}
            placeholder={t('user.enterNickname') || '请输入用户名'}
            maxLength={50}
          />
        </div>

        {/* 保存按钮 */}
        <div className={styles.editButtonGroup}>
          <Button
            className={styles.editCancelBtn}
            onClick={onClose}
          >
            {t('common.cancel') || '取消'}
          </Button>
          <Button
            className={styles.editSaveBtn}
            onClick={saveUserProfile}
          >
            {t('common.save') || '保存'}
          </Button>
        </div>
      </div>
    </Popup>
  );
};

export default EditProfilePopup;
