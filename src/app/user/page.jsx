'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAccount, useDisconnect, useSignMessage } from 'wagmi';
import { Button, Avatar, List, Dialog, Toast, Popup, Grid, TextArea } from 'antd-mobile';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import CalendarCard from '../../components/CalendarCard';
import NewCoinListing from '../../components/NewCoinListing';
import LoginModal from '../../components/LoginModal';
import { RightArrowIcon } from '../../components/Icons';
import { request } from '../../utils/request';
import { Interface, EMAIL, COINKEY } from '../../utils/constants';
import styles from './page.module.less';

export default function UserPage() {
  // 状态定义
  const router = useRouter();
  const searchParams = useSearchParams();
  const { disconnect } = useDisconnect();
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { t, i18n } = useTranslation();
  const [userInfo, setUserInfo] = useState({
    avatar: 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/avatar.png',
    nickname: '用户',
    level: 1,
    isVip: false,
    isLogin: false
  });
  const DEFAULT_AVATAR = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/avatar.png';
  const EDIT_ICON = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/edit.png';
  const [popVis, setPopVis] = useState(false);
  const [popType, setPopType] = useState('');
  const [reportScore, setReportScore] = useState(null);
  const [scoreDisable, setScoreDisable] = useState(true);
  const scoreInputRef = useRef('');
  const [showSecondaryActions, setShowSecondaryActions] = useState(true);
  const [showPointsSection, setShowPointsSection] = useState(true);
  const [showNewCoinListing, setShowNewCoinListing] = useState(true);
  const [showCalendarSection, setShowCalendarSection] = useState(true);
  const [showThemeOption, setShowThemeOption] = useState(true);
  const [showSocialOption, setShowSocialOption] = useState(true);
  const [showContactPop, setShowContactPop] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editNickname, setEditNickname] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginModalMode, setLoginModalMode] = useState('login');
  const [unreadCount, setUnreadCount] = useState(0);
  
  // 简单的 Cookie 读写（仅前端可见；敏感 token 建议服务端 HttpOnly）
  const getCookie = (name) => {
    if (typeof document === 'undefined') return '';
    const row = document.cookie.split('; ').find((r) => r.startsWith(`${encodeURIComponent(name)}=`));
    return row ? decodeURIComponent(row.split('=')[1]) : '';
  };
  const delCookie = (name) => {
    if (typeof document === 'undefined') return;
    document.cookie = `${encodeURIComponent(name)}=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; SameSite=Lax`;
  };

  // 检查 URL 参数，自动打开注册弹窗或登录弹窗
  useEffect(() => {
    const mode = searchParams.get('mode');
    const showLogin = searchParams.get('showLogin');
    
    if (mode === 'register') {
      setLoginModalMode('register');
      setShowLoginModal(true);
    } else if (showLogin === 'true') {
      setLoginModalMode('login');
      setShowLoginModal(true);
    }
  }, [searchParams]);

  // 首次与聚焦时同步登录态（来自 token 或钱包地址 Cookie）
  useEffect(() => {
    const syncLogin = () => {
      const hasToken = !!localStorage.getItem('token');
      const walletAddr = getCookie('wallet_address');
      const loggedIn = hasToken || !!walletAddr;
      setUserInfo((prev) => ({ ...prev, isLogin: loggedIn }));
      const ui = localStorage.getItem('userInfo');
      if (ui) {
        try {
          const parsed = JSON.parse(ui);
          setUserInfo((prev) => ({ ...prev, nickname: parsed.nickName || prev.nickname, avatar: parsed.avatar || prev.avatar }));
        } catch {}
      }
    };
    syncLogin();
    const onFocus = () => syncLogin();
    window.addEventListener('focus', onFocus);
    const timer = setInterval(syncLogin, 2000);
    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(timer);
    };
  }, []);

  // 每次都强制签名登录
  const signingRef = useRef(false);
  const pendingSignRef = useRef(false);
  const triggerSignatureLogin = async () => {
    if (signingRef.current) return;
    signingRef.current = true;
    try {
      const currentAddress = address || getCookie('wallet_address');
      if (!currentAddress) {
        Toast.show({ content: '请先连接钱包', position: 'bottom' });
        return;
      }
      const nonce = Math.random().toString(36).slice(2) + Date.now();
      const domain = typeof location !== 'undefined' ? location.host : 'moziinnovations.com';
      const statement = 'Sign in to Mozi';
      const message = `Domain: ${domain}\nAddress: ${currentAddress}\nNonce: ${nonce}\nTimestamp: ${new Date().toISOString()}\nStatement: ${statement}`;
      const signature = await signMessageAsync({ message });

      try {
        const res = await request({
          url: Interface.MOZI_LOGIN,
          method: 'POST',
          data: {
            type: 'login',
            chanel: 3,  // 3-钱包登录
            address: currentAddress,
            signatrue: signature  // 注意：后端字段名为 signatrue
          },
        });
        if (res?.data?.token) localStorage.setItem('token', res.data.token);
        if (res?.data?.user) localStorage.setItem('userInfo', JSON.stringify(res?.data?.user));
      } catch {}

      setUserInfo((prev) => ({ ...prev, isLogin: true }));
      Toast.show({ content: '登录成功（已签名）', position: 'bottom' });
    } catch (e) {
      Toast.show({ content: '签名被取消或失败', position: 'bottom' });
    } finally {
      signingRef.current = false;
    }
  };

  // 登录处理：打开登录弹窗
  const handleLogin = () => {
    setShowLoginModal(true);
  };

  // 监听连接完成后自动发起签名
  useEffect(() => {
    if (pendingSignRef.current && isConnected && address) {
      pendingSignRef.current = false;
      triggerSignatureLogin();
    }
  }, [isConnected, address]);
  
  // 退出登录
  const handleLogout = () => {
    try { disconnect?.(); } catch {}
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('userInfo');
      delCookie('wallet_address');
      delCookie('wallet_chainId');
    } catch {}
    setUserInfo((prev) => ({ ...prev, isLogin: false }));
    Toast.show({ content: '退出成功', position: 'bottom' });
  };

  // 开通会员
  const handleVip = () => {
    Dialog.confirm({
      content: '是否开通墨子VIP会员？',
      onConfirm: () => {
        Toast.show({
          content: '请在小程序中开通会员',
          position: 'bottom',
        });
      },
    });
  };

  const handleShare = () => {
    try {
      if (navigator.share) {
        navigator.share({
          title: 'Mozi行情助手',
          text: '专业的加密数据分析智能平台',
          url: window.location.origin,
        });
      } else {
        navigator.clipboard.writeText(window.location.origin).then(() => {
          Toast.show({ content: '链接已复制到剪贴板', position: 'bottom' });
        }).catch(() => {
          Toast.show({ content: '分享失败', position: 'bottom' });
        });
      }
    } catch {}
  };

  // 未读通知数量
  useEffect(() => {
    let timer;
    const fetchUnread = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) { setUnreadCount(0); return; }
        const res = await request({ url: Interface.GET_UNREAD_COUNT });
        const count = res?.data?.count ?? res?.data ?? 0;
        if (typeof count === 'number') setUnreadCount(count);
      } catch {}
    };
    fetchUnread();
    timer = setInterval(fetchUnread, 30000);
    return () => clearInterval(timer);
  }, []);

  const score = () => {
    if (!userInfo.isLogin) {
      Toast.show({ content: '请先登录', position: 'bottom' });
      return;
    }
    setPopVis(true);
    setPopType('score');
  };

  const about = () => {
    setPopVis(true);
    setPopType('about');
  };

  const contact = () => {
    if (showContactPop) {
      setPopVis(true);
      setPopType('contact');
    } else {
      Toast.show({ content: '敬请期待', position: 'bottom' });
    }
  };

  const attendUs = () => {
    // 跳转到 X (Twitter) 账号
    window.open('https://x.com/Innovation56171', '_blank');
  };

  const reward = () => {
    setPopVis(true);
    setPopType('reward');
  };

  const onScoreSelect = (scoreValue) => {
    setReportScore(scoreValue);
    setScoreDisable(false);
  };

  const onScoreTextChange = (value) => {
    scoreInputRef.current = value;
  };

  const submitScore = async () => {
    try {
      const res = await request({
        url: Interface.MOZI_COMMENT,
        method: 'POST',
        data: { score: reportScore, content: scoreInputRef.current },
      });
      if (res?.data?.isSuccess) {
        Toast.show({ content: '反馈成功', position: 'bottom' });
      } else {
        Toast.show({ content: '反馈失败', position: 'bottom' });
      }
    } catch (e) {
      Toast.show({ content: '反馈失败', position: 'bottom' });
    }
    setPopVis(false);
  };

  const copyToClipboard = (value) => {
    navigator.clipboard.writeText(value).then(() => {
      Toast.show({ content: '复制成功', position: 'bottom' });
    }).catch(() => {
      Toast.show({ content: '复制失败', position: 'bottom' });
    });
  };

  const changeLanguage = () => {
    setPopVis(true);
    setPopType('language');
  };
  
  const selectLanguage = (lng) => {
    i18n.changeLanguage(lng);
    // 确保语言设置被持久化到 localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('i18nextLng', lng);
    }
    Toast.show({
      content: lng === 'zh' ? '已切换到中文' : 'Switched to English',
      duration: 1000,
      position: 'bottom'
    });
    setPopVis(false);
  };

  // 打开编辑个人资料弹窗
  const openEditProfile = () => {
    // 如果昵称是"微信用户"或空，则不填充
    const nickname = (userInfo.nickname && userInfo.nickname !== '微信用户') ? userInfo.nickname : '';
    setEditNickname(nickname);
    setEditAvatar(userInfo.avatar || DEFAULT_AVATAR);
    setAvatarFile(null);
    setShowEditProfile(true);
  };

  // 处理头像选择
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // 检查文件大小（限制为2MB）
      if (file.size > 2 * 1024 * 1024) {
        Toast.show({
          content: t('user.avatarTooLarge') || '头像文件太大，请选择小于2MB的图片',
          position: 'bottom',
          icon: 'fail'
        });
        return;
      }
      
      // 读取文件并转换为 base64
      const reader = new FileReader();
      reader.onload = (event) => {
        setEditAvatar(event.target.result);
        setAvatarFile(file);
      };
      reader.readAsDataURL(file);
    }
  };

  // 处理登录成功
  const handleLoginSuccess = () => {
    const syncLogin = () => {
      const hasToken = !!localStorage.getItem('token');
      const walletAddr = getCookie('wallet_address');
      const loggedIn = hasToken || !!walletAddr;
      setUserInfo((prev) => ({ ...prev, isLogin: loggedIn }));
      const ui = localStorage.getItem('userInfo');
      if (ui) {
        try {
          const parsed = JSON.parse(ui);
          setUserInfo((prev) => ({ ...prev, nickname: parsed.nickName || prev.nickname, avatar: parsed.avatar || prev.avatar }));
        } catch {}
      }
    };
    syncLogin();
  };

  // 处理钱包登录
  const handleWalletLogin = async () => {
    if (typeof window === 'undefined') return;
    if (!isConnected) {
      pendingSignRef.current = true;
      if (window.__openAppKit) {
        window.__openAppKit();
      } else {
        Toast.show({ content: '钱包组件尚未就绪', position: 'bottom' });
      }
      return;
    }
    await triggerSignatureLogin();
  };

  // 保存用户信息
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
      const res = await request({
        url: Interface.UPDATE_USER_INFO,
        method: 'POST',
        data: {
          avatar: editAvatar,
          nickName: editNickname.trim(),
        }
      });

      if (res?.data) {
        // 更新本地用户信息
        setUserInfo(prev => ({
          ...prev,
          nickname: editNickname.trim(),
          avatar: res.data // 服务器返回的头像URL
        }));

        Toast.clear();
        Toast.show({
          content: t('user.saveSuccess') || '保存成功',
          position: 'bottom',
          icon: 'success'
        });
        setShowEditProfile(false);
      } else {
        Toast.clear();
        Toast.show({
          content: t('user.saveFailed') || '保存失败',
          position: 'bottom',
          icon: 'fail'
        });
      }
    } catch (error) {
      console.error('保存用户信息失败:', error);
      Toast.clear();
      Toast.show({
        content: t('user.saveFailed') || '保存失败',
        position: 'bottom',
        icon: 'fail'
      });
    }
  };

  const footerList = [
    {
      key: 'language',
      icon: (<img src={'/icons/zh-en.svg'} alt="语言设置" style={{ width: 22, height: 22 }} />),
      text: t('user.language'),
      extra: i18n.language === 'zh' ? '中文' : 'English',
      callback: () => changeLanguage()
    },
    {
      key: 'theme',
      icon: (<img src={'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/me_slices/skin%402x.png'} alt="皮肤中心" style={{ width: 22, height: 22 }} />),
      text: t('user.skinCenter'),
      extra: '',
      callback: () => Toast.show({ content: t('user.comingSoon'), position: 'bottom' })
    },
    {
      key: 'contact',
      icon: (<img src={'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/me_slices/me-contact%402x.png'} alt="联系我们" style={{ width: 22, height: 22 }} />),
      text: t('user.contactUs'),
      extra: '',
      callback: () => contact()
    },
    {
      key: 'social',
      icon: (<img src={'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/me_slices/social%402x.png'} alt="社交媒体" style={{ width: 22, height: 22 }} />),
      text: t('user.socialMedia'),
      extra: '',
      callback: () => Toast.show({ content: t('user.comingSoon'), position: 'bottom' })
    },
    {
      key: 'about',
      icon: (<img src={'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/me_slices/about%402x.png'} alt="关于" style={{ width: 22, height: 22 }} />),
      text: t('user.about'),
      extra: '',
      callback: () => about()
    },
    {
      key: 'donate',
      icon: (<img src={'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/me_slices/donate%402x.png'} alt="捐赠" style={{ width: 22, height: 22 }} />),
      text: t('user.donate'),
      extra: '',
      callback: () => reward()
    }
  ];

  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.headerBox}>
          {userInfo.isLogin ? (
            <div className={styles.headerUser}>
              <img className={styles.headerAvatar} src={userInfo.avatar || DEFAULT_AVATAR} alt="头像" />
              <span>{address ? `${address.slice(0, 6)}...${address.slice(-4)}` : (userInfo.nickname || t('user.profile'))}</span>
              <img className={styles.editIcon} src={EDIT_ICON} alt="编辑" onClick={openEditProfile} />
            </div>
          ) : (
            <div className={styles.loginBox}>
              <div className={styles.headerUser} onClick={handleLogin}>
                <img className={styles.headerAvatar} src={DEFAULT_AVATAR} alt="头像" />
                <span>{t('user.pleaseLogin')}</span>
              </div>
            </div>
          )}

          <div className={styles.actionButtons}>
            <div className={styles.actionButton} onClick={() => (window.location.href = '/market?type=favorite')}>
              <div className={styles.actionIcon}>
                <img className={styles.actionIconImg} src={'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/me_slices/optional%402x.png'} alt="我的自选" />
              </div>
              <div className={styles.actionText}>{t('user.myFavorites')}</div>
            </div>
            <div className={styles.actionButton} onClick={() => (window.location.href = '/alert')}>
              <div className={styles.actionIcon}>
                <img className={styles.actionIconImg} src={'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/me_slices/me-alert%402x.png'} alt="我的报警" />
              </div>
              <div className={styles.actionText}>{t('user.myWarnings')}</div>
            </div>
            <div className={styles.actionButton} onClick={attendUs}>
              <div className={styles.actionIcon}>
                <img className={styles.actionIconImg} src={'/icons/twitter.svg'} alt={t('user.followTwitter')} />
              </div>
              <div className={styles.actionText}>{t('user.followTwitter')}</div>
            </div>
            </div>
          </div>
          
        {showSecondaryActions && (
          <div className={styles.secondaryActions}>
            <div className={styles.actionRow}>
              <div className={styles.actionButton} onClick={() => (window.location.href = '/mycomments')}>
                <div className={styles.actionIcon}>
                  <img className={styles.actionIconImg} src={'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/me_slices/comment%402x.png'} alt="我的评论" />
                </div>
                <div className={styles.actionText}>{t('user.myComments')}</div>
              </div>
              <div className={styles.actionButton} onClick={() => (window.location.href = '/mynotices')}>
                <div className={styles.actionIcon} style={{ position: 'relative' }}>
                  <img className={styles.actionIconImg} src={'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/me_slices/mail%402x.png'} alt="消息通知" />
                  {unreadCount > 0 && <div className={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</div>}
                </div>
                <div className={styles.actionText}>{t('user.messageNotification')}</div>
              </div>
              <div className={styles.actionButton} onClick={() => Toast.show({ content: t('user.comingSoon'), position: 'bottom' })}>
                <div className={styles.actionIcon}>
                  <img className={styles.actionIconImg} src={'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/me_slices/like%402x.png'} alt="我的点赞" />
                </div>
                <div className={styles.actionText}>{t('user.myLikes')}</div>
              </div>
            </div>
          </div>
        )}

        <div className={styles.horizontalButtons}>
          {!userInfo.isLogin ? (
            <div className={`${styles.horizontalBtn} ${styles.left}`} onClick={handleLogin}>
              <div className={styles.btnIcon}>
                <img className={styles.btnIconImg} src={'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/me_slices/feedback%402x.png'} alt="反馈" />
              </div>
              <div className={styles.btnBottom}>
                <div className={styles.btnContent}>
                  <div className={styles.btnText}>{t('user.feedback')}</div>
                  <div className={styles.btnSubtext}>{t('user.feedbackDesc')}</div>
                </div>
                <div className={styles.btnArrow}>
                  <RightArrowIcon size={24} color="#A5A9AF" />
                </div>
              </div>
            </div>
          ) : (
            <div className={`${styles.horizontalBtn} ${styles.left}`} onClick={score}>
              <div className={styles.btnIcon}>
                <img className={styles.btnIconImg} src={'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/me_slices/feedback%402x.png'} alt="反馈" />
              </div>
              <div className={styles.btnBottom}>
                <div className={styles.btnContent}>
                  <div className={styles.btnText}>{t('user.feedback')}</div>
                  <div className={styles.btnSubtext}>{t('user.feedbackDesc')}</div>
                </div>
                <div className={styles.btnArrow}>
                  <RightArrowIcon size={24} color="#A5A9AF" />
                </div>
              </div>
            </div>
          )}
          <div className={`${styles.horizontalBtn} ${styles.right}`} onClick={handleShare}>
            <div className={styles.btnIcon}>
              <img className={styles.btnIconImg} src={'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/me_slices/me-share%402x.png'} alt="推荐朋友" />
            </div>
            <div className={styles.btnBottom}>
              <div className={styles.btnContent}>
                <div className={styles.btnText}>{t('user.recommendFriend')}</div>
                <div className={styles.btnSubtext}>{t('user.recommendDesc')}</div>
              </div>
              <div className={styles.btnArrow}>
                <RightArrowIcon size={24} color="#A5A9AF" />
              </div>
            </div>
          </div>
        </div>
        
        {showPointsSection && (
          <div className={styles.pointsSection}>
            <div className={styles.pointsInfo} onClick={() => router.push('/pointsdetail')}>
              <span className={styles.pointsTitle}>{t('user.myPoints')}</span>
              <div className={styles.pointsValueRow}>
                <span className={styles.pointsValue}>2000</span>
                <span className={styles.pointsDaily}>{t('user.yesterdayPoints', { points: 100 })}</span>
              </div>
              <span className={styles.pointsRank}>{t('user.currentRank', { rank: 23 })}</span>
            </div>
            <div className={styles.pointsAction} onClick={() => router.push('/points')}>
              <span className={styles.pointsButton}>{t('user.pointsRanking')}</span>
              <RightArrowIcon size={18} color="#fff"  />
            </div>
            <img className={styles.pointsCoin} src={'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/image/integral-coin.png'} alt="coin" />
          </div>
        )}

        {showCalendarSection && (
          <div className={styles.calendarSection}>
            <CalendarCard />
          </div>
        )}

        {showNewCoinListing && (
          <div className={styles.newCoinSection}>
            <NewCoinListing showMore={false} />
          </div>
        )}

        <div className={styles.flexSpacer}></div>

        <div className={styles.footer}>
          <List className={styles.footerList}>
            {footerList.map((item, index) => {
              if (item.key === 'theme' && !showThemeOption) return null;
              if (item.key === 'social' && !showSocialOption) return null;
              return (
                <List.Item key={index} className={`${styles.footerItem} ${index === footerList.length - 1 ? styles.last : ''}`} onClick={item.callback}>
                  <div className={styles.footerBtn}>
                    <div className={styles.icon}>{item.icon}</div>
                    <div className={styles.text}>{item.text}</div>
                    <div className={styles.extra}>{item.extra}</div>
                  </div>
              </List.Item>
              );
            })}
          </List>
        </div>

        {userInfo.isLogin && (
          <Button className={styles.logoutBtn} onClick={handleLogout}>{t('user.logout')}</Button>
        )}
        
        <Popup
          visible={popVis}
          onMaskClick={() => setPopVis(false)}
          onClose={() => setPopVis(false)}
          position='bottom'
          bodyStyle={{ borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}
        >
          {popType === 'about' && (
            <div className={styles.popContainer}>
              <div className={styles.aboutItem}>
                Mozi 是一家专业的加密数据分析智能平台，致力于为全球用户提供精准，实时的加密货币市场数据和分析服务，简化交易，降低交易的门槛，帮助用户在加密货币市场中做出明智的投资决策，降低风险，获得更高的收益。
              </div>
              <br />
              <div className={`${styles.aboutItem} ${styles.secDesc}`}>
                作为一家专业的加密数据分析平台，为解决用户去哪里买，买什么，怎么买的痛点，Mozi通过整合多种数据，提供详尽的搜索和丰富的各类排行榜让用户探索，包括但不限于交易所排行榜，热门币种排行榜，价格涨跌幅榜，目前覆盖主流交易所的数据。
                为了保证数据的准确性和实时性，Mozi 团队由经验丰富的专业人士组成，涵盖交易、数据开发、数据分析,人工智能，和平台架构，他们的专业知识和技能为平台数据的准确性和可靠性提供了强大支持。
                作为初创公司，Mozi 秉持墨子兼爱非攻的理念，致力于在全球传播这一理念。同时也诚邀感兴趣的技术，运营，产品以及投资机构联系我们。
              </div>
              <div className={`${styles.aboutItem} ${styles.secCon}`}>
                <strong>Mozi使命：</strong>
                让财富触手可及
              </div>
              <div className={styles.aboutItem}>
                <strong>Mozi愿景：</strong>
                让交易更简单，更智能，更安全
              </div>
              <div className={styles.aboutItem}>
                <strong>Mozi价值观：</strong>
                兼爱 务实 专注 创新 自由
              </div>
            </div>
          )}

          {popType === 'score' && (
            <div className={styles.popContainer}>
              <div>{t('user.feedbackQuestion')}</div>
              <div className={styles.scoreDesc}>
                <span>{t('user.veryUnwilling')}</span>
                <span>{t('user.veryWilling')}</span>
              </div>
              <Grid className={styles.scoreList} columns={10} gap={5}>
                {[1,2,3,4,5,6,7,8,9,10].map((item) => (
                  <Grid.Item key={item} className={`${styles.scoreItem} ${item === reportScore ? styles.scoreActive : ''}`} onClick={() => onScoreSelect(item)}>
                    {item}
                  </Grid.Item>
                ))}
              </Grid>
              <div className={styles.scoreCon}>
                <div>
                  <span>{t('user.moreFeedback')}</span>
                  <span className={styles.scoreConDesc}>{t('user.optional')}</span>
                </div>
                <TextArea className={styles.scoreText} placeholder={t('user.feedbackPlaceholder')} maxLength={200} onChange={onScoreTextChange} rows={4} />
              </div>
              <Button className={`${styles.scoreBtn} ${scoreDisable ? styles.scoreBtnDisable : ''}`} onClick={submitScore} disabled={scoreDisable} block>
                {t('common.submit')}
          </Button>
            </div>
          )}

          {popType === 'contact' && showContactPop && (
            <div className={`${styles.popContainer} ${styles.contactContainer}`}>
              <div className={styles.contactTitle}>{t('user.welcomeContact')}</div>
              <div className={styles.contactEmail}>
                <span>{EMAIL}</span>
                <div className={styles.contactCopy} onClick={() => copyToClipboard(EMAIL)}>📋</div>
              </div>
            </div>
          )}

          {popType === 'attend' && (
            <div className={styles.popContainer}>
              <div className={styles.contactTitle}>{t('user.welcomeFollowUs')}</div>
              <img className={styles.attendPic} src='https://image-1317406749.cos.ap-shanghai.myqcloud.com/wechat_account.jpg' alt='公众号二维码' />
            </div>
          )}

          {popType === 'reward' && (
            <div className={styles.scrollContainer}>
              <div className={styles.contactTitle}>{t('user.donateSupport')}</div>
              <div className={styles.rewardScrollBox}>
                <div className={styles.rewardBox}>
                  <img className={styles.attendPic} src='https://image-1317406749.cos.ap-shanghai.myqcloud.com/wechat_pay.jpg' alt='微信支付' />
                </div>
                <div className={styles.rewardBox}>
                  <img className={styles.attendPic} src='https://image-1317406749.cos.ap-shanghai.myqcloud.com/BTC-simple.jpg' alt='BTC地址' />
                  <div className={styles.contactEmail}>
                    <span className={styles.coinKey}>{COINKEY.BTC}</span>
                    <div className={styles.contactCopy} onClick={() => copyToClipboard(COINKEY.BTC)}>📋</div>
                  </div>
                </div>
                <div className={styles.rewardBox}>
                  <img className={styles.attendPic} src='https://image-1317406749.cos.ap-shanghai.myqcloud.com/ETH-simple.jpg' alt='ETH地址' />
                  <div className={styles.contactEmail}>
                    <span>{COINKEY.ETH}</span>
                    <div className={styles.contactCopy} onClick={() => copyToClipboard(COINKEY.ETH)}>📋</div>
                  </div>
                </div>
                <div className={styles.rewardBox}>
                  <img className={styles.attendPic} src='https://image-1317406749.cos.ap-shanghai.myqcloud.com/Tron-simple.jpg' alt='Tron地址' />
                  <div className={styles.contactEmail}>
                    <span>{COINKEY.TRON}</span>
                    <div className={styles.contactCopy} onClick={() => copyToClipboard(COINKEY.TRON)}>📋</div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {popType === 'language' && (
            <div className={styles.popContainer}>
              <div className={styles.contactTitle}>{t('user.selectLanguage')}</div>
              <List className={styles.languageList}>
                <List.Item 
                  className={`${styles.languageItem} ${i18n.language === 'zh' ? styles.languageItemActive : ''}`}
                  onClick={() => selectLanguage('zh')}
                >
                  <div className={styles.languageOption}>
                    <span>简体中文</span>
                    {i18n.language === 'zh' && <span className={styles.languageCheck}>✓</span>}
                  </div>
                </List.Item>
                <List.Item 
                  className={`${styles.languageItem} ${i18n.language === 'en' ? styles.languageItemActive : ''}`}
                  onClick={() => selectLanguage('en')}
                >
                  <div className={styles.languageOption}>
                    <span>English</span>
                    {i18n.language === 'en' && <span className={styles.languageCheck}>✓</span>}
                  </div>
                </List.Item>
              </List>
            </div>
          )}
        </Popup>

        {/* 编辑用户信息弹窗 */}
        <Popup
          visible={showEditProfile}
          onMaskClick={() => setShowEditProfile(false)}
          onClose={() => setShowEditProfile(false)}
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
                onClick={() => setShowEditProfile(false)}
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

        {/* 登录注册弹窗 */}
        <LoginModal
          visible={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={handleLoginSuccess}
          onWalletLogin={handleWalletLogin}
          initialMode={loginModalMode}
        />
      </div>
    </Layout>
  );
}