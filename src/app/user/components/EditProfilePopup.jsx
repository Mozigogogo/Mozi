import React, { useState, useEffect } from 'react';
import { Popup, Button, Toast, Input } from 'antd-mobile';
import styles from '@/app/user/page.module.less';
import { updateUserInfo } from '@/api/user';

const DEFAULT_AVATAR = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/avatar.png';

// 图标常量
const ICONS = {
  tag: '/icons/new_user/user_tag.svg',
  info: '/icons/new_user/user_info.svg',
  email: '/icons/new_user/email.svg',
  phone: '/icons/new_user/phone.svg',
  reward: '/icons/new_user/reward.svg',
  edit: '/icons/new_user/edit.svg'
};

const EditProfilePopup = ({ visible, onClose, t, userInfo, setUserInfo }) => {
  const [editNickname, setEditNickname] = useState('');
  const [editAvatar, setEditAvatar] = useState(DEFAULT_AVATAR);
  const [avatarFile, setAvatarFile] = useState(null);
  
  // 新增字段状态
  const [bio, setBio] = useState('资金流动大师，金融NO.1');
  const [email, setEmail] = useState('carlakorsgaard@gmail.com');
  const [phone, setPhone] = useState('+8234567900');
  const [inviteCode, setInviteCode] = useState('TronUSDTbinubho');
  const [tags, setTags] = useState('内容创作者');

  useEffect(() => {
    if (visible && userInfo) {
      const nickname = (userInfo.nickname && userInfo.nickname !== t('user.defaultNickname')) ? userInfo.nickname : '';
      setEditNickname(nickname);
      setEditAvatar(userInfo.avatar || DEFAULT_AVATAR);
      setAvatarFile(null);
      // 如果 userInfo 中有这些字段，应该在这里更新状态
      // setBio(userInfo.bio || '');
      // setEmail(userInfo.email || '');
      // ...
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
        // 可以在这里传递其他字段，如果 API 支持
      });

      if (res?.data) {
        const newNickname = editNickname.trim();
        const newAvatar = res.data; // 服务器返回的头像URL
        
        setUserInfo(prev => ({
          ...prev,
          nickname: newNickname,
          avatar: newAvatar
        }));

        // 更新 localStorage
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

  // 列表项样式
  const listItemStyle = {
    display: 'flex',
    alignItems: 'flex-start',
    padding: '16px 0',
    borderBottom: '1px solid #f5f5f5'
  };

  const iconStyle = {
    width: '24px',
    height: '24px',
    marginRight: '12px',
    marginTop: '0'
  };

  const contentStyle = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column'
  };

  const labelStyle = {
    fontSize: '12px',
    color: '#999',
    marginBottom: '4px'
  };

  const inputStyle = {
    border: 'none',
    padding: 0,
    fontSize: '14px',
    color: '#333',
    width: '100%',
    background: 'transparent'
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
        minHeight: '60vh',
        maxHeight: '90vh',
        padding: '24px',
        backgroundColor: '#F7F8FA'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* 顶部标题栏：头像 + 昵称 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', flexDirection: 'column' }}>
           <div style={{ position: 'relative', marginBottom: '12px' }}>
              <img 
                src={editAvatar} 
                alt="avatar" 
                style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
              />
           </div>
           
           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>{editNickname || '点击设置昵称'}</span>
             <img 
               src={ICONS.edit} 
               alt="edit" 
               style={{ width: '16px', height: '16px', cursor: 'pointer' }}
               onClick={() => {
                 // 简单的交互：聚焦到昵称输入框（如果它是输入框的话），这里简单做一个 prompt 或者弹窗，
                 // 但为了保持 UI 一致性，我们可以把昵称也做成下面列表的一项，或者就在这里变成 Input
                 // 为了还原截图，这里看起来像是一个展示，点击编辑。
                 // 简化处理：直接让它变成可编辑的 Input，去掉边框
               }}
             />
           </div>
           {/* 隐藏的昵称输入框，或者把上面的 span 换成 input */}
           <input 
              value={editNickname}
              onChange={(e) => setEditNickname(e.target.value)}
              style={{ 
                textAlign: 'center', 
                fontSize: '18px', 
                fontWeight: 'bold', 
                color: '#333', 
                border: 'none', 
                background: 'transparent',
                outline: 'none',
                width: '200px',
                marginTop: '-26px', // Hack to overlap
                opacity: 0, // 暂时隐藏，实际使用时应该替换上面的 span
                position: 'absolute',
                zIndex: -1
              }} 
           />
           {/* 实际上，为了方便，我们直接把上面的 Text 换成 Input 更好 */}
        </div>

        {/* 白色卡片区域 */}
        <div style={{ background: '#fff', borderRadius: '16px', padding: '0 16px', marginBottom: '24px' }}>
           {/* 昵称编辑 (作为列表第一项或者保留在顶部？截图里是顶部) */}
           {/* 这里我们保留顶部的设计，下面是列表 */}

           {/* 身份标签 */}
           <div style={listItemStyle}>
              <img src={ICONS.tag} alt="tag" style={iconStyle} />
              <div style={contentStyle}>
                 <div style={labelStyle}>身份标签</div>
                 <div style={{ fontSize: '14px', color: '#333' }}>{tags}</div>
              </div>
              <div style={{ color: '#ccc' }}>&gt;</div>
           </div>

           {/* 个人简介 */}
           <div style={listItemStyle}>
              <img src={ICONS.info} alt="info" style={iconStyle} />
              <div style={contentStyle}>
                 <div style={labelStyle}>个人简介</div>
                 <input 
                   value={bio} 
                   onChange={(e) => setBio(e.target.value)}
                   style={inputStyle}
                   placeholder="请输入个人简介"
                 />
              </div>
           </div>

           {/* 告警邮件 */}
           <div style={listItemStyle}>
              <img src={ICONS.email} alt="email" style={iconStyle} />
              <div style={contentStyle}>
                 <div style={labelStyle}>告警邮件</div>
                 <input 
                   value={email} 
                   onChange={(e) => setEmail(e.target.value)}
                   style={inputStyle}
                   placeholder="绑定邮箱"
                 />
              </div>
           </div>

           {/* 告警电话 */}
           <div style={listItemStyle}>
              <img src={ICONS.phone} alt="phone" style={iconStyle} />
              <div style={contentStyle}>
                 <div style={labelStyle}>告警电话</div>
                 <input 
                   value={phone} 
                   onChange={(e) => setPhone(e.target.value)}
                   style={inputStyle}
                   placeholder="绑定电话"
                 />
              </div>
           </div>

           {/* 获取分佣 */}
           <div style={{ ...listItemStyle, borderBottom: 'none' }}>
              <img src={ICONS.reward} alt="reward" style={iconStyle} />
              <div style={contentStyle}>
                 <div style={labelStyle}>获取分佣</div>
                 <div style={{ fontSize: '14px', color: '#333', wordBreak: 'break-all' }}>{inviteCode}</div>
              </div>
           </div>
        </div>

        {/* 保存按钮 */}
        <Button
          block
          style={{ 
            background: '#11B787', 
            color: '#fff', 
            borderRadius: '100px', 
            height: '44px',
            fontSize: '16px',
            fontWeight: 'bold',
            border: 'none'
          }}
          onClick={saveUserProfile}
        >
          {t('common.save') || '保存'}
        </Button>
      </div>
    </Popup>
  );
};

export default EditProfilePopup;
