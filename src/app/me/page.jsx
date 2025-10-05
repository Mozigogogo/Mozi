'use client';

import React, { useState, useEffect, useRef } from 'react';
import { List, Popup, Grid, Button, TextArea, Toast } from 'antd-mobile';
import { useRouter } from 'next/navigation';
import { request } from '../../utils/request';
import { jump2Detail, jump2Market, jump2NoTab } from '../../utils/core';
import { EMAIL, COINKEY, Interface } from '../../utils/constants';
import Layout from '../../components/Layout';
import styles from './page.module.less';

let isReporting = false;

export default function Me() {
  const router = useRouter();
  
  const [userInfo, setUserInfo] = useState({});
  const [popVis, setPopVis] = useState(false);
  const [popType, setPopType] = useState('');
  const [reportScore, setScore] = useState(null);
  const [isLogin, setIsLogin] = useState(false);
  const [scoreDisable, setScoreDisable] = useState(true);
  const scoreInput = useRef('');
  
  const footerList = [
    {
      key: 'share',
      icon: '📤',
      text: '推荐给朋友',
      extra: '›',
      callback: () => handleShare()
    },
    {
      key: 'score',
      icon: '⭐',
      text: '产品功能反馈',
      extra: '›',
      callback: () => score()
    },
    {
      key: '',
      icon: 'ℹ️',
      text: '关于',
      extra: '›',
      callback: () => about()
    },
    {
      key: '',
      icon: '📧',
      text: '联系我们',
      extra: '›',
      callback: () => contact()
    },
    {
      key: '',
      icon: '💰',
      text: '赞赏',
      extra: '›',
      callback: () => reward()
    }
  ];
  
  useEffect(() => {
    // 检查登录状态
    const token = localStorage.getItem('token');
    if (token) {
      setIsLogin(true);
      const userInfoStr = localStorage.getItem('userInfo');
      if (userInfoStr) {
        try {
          const userInfoData = JSON.parse(userInfoStr);
          setUserInfo({
            avatar: userInfoData.avatar,
            nickName: userInfoData.nickName
          });
        } catch (error) {
          console.error('解析用户信息失败:', error);
        }
      }
    } else {
      setIsLogin(false);
    }
  }, []);
  
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Mozi行情助手',
        text: '专业的加密数据分析智能平台',
        url: window.location.origin
      }).catch(console.error);
    } else {
      // 复制链接到剪贴板
      navigator.clipboard.writeText(window.location.origin).then(() => {
        Toast.show('链接已复制到剪贴板');
      }).catch(() => {
        Toast.show('分享失败');
      });
    }
  };
  
  const score = () => {
    if (!isLogin) {
      Toast.show('请先登录');
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
    setPopVis(true);
    setPopType('contact');
  };
  
  const attendUs = () => {
    setPopVis(true);
    setPopType('attend');
  };
  
  const reward = () => {
    setPopVis(true);
    setPopType('reward');
  };
  
  const scoreReport = (score) => {
    setScore(score);
    setScoreDisable(false);
  };
  
  const getTextValue = (value) => {
    scoreInput.current = value;
  };
  
  const confirmScore = async () => {
    if (isReporting) return;
    isReporting = true;
    
    try {
      const commentRes = await request({
        url: Interface.MOZI_COMMENT,
        method: 'POST',
        data: {
          score: reportScore,
          content: scoreInput.current
        }
      });
      
      if (commentRes?.data?.isSuccess) {
        Toast.show('反馈成功');
      } else {
        Toast.show('反馈失败');
      }
    } catch (error) {
      Toast.show('反馈失败');
    }
    
    isReporting = false;
    setPopVis(false);
  };
  
  const copy = (value) => {
    navigator.clipboard.writeText(value).then(() => {
      Toast.show('复制成功');
    }).catch(() => {
      Toast.show('复制失败');
    });
  };
  
  const jump2User = () => {
    router.push(`/user?avatar=${encodeURIComponent(userInfo.avatar || '')}&nickName=${encodeURIComponent(userInfo.nickName || '')}`);
  };
  
  const phoneLogin = () => {
    // H5环境下的登录逻辑
    Toast.show('请使用微信小程序登录');
  };
  
  const logout = () => {
    if (!isLogin) {
      Toast.show('您已退出登录');
      return;
    }
    localStorage.removeItem('token');
    localStorage.removeItem('userInfo');
    setIsLogin(false);
    setUserInfo({});
    Toast.show('退出成功');
  };
  
  return (
    <Layout>
      <div className={styles.me}>
        <div className={styles.header}>
          {isLogin ? (
            <div className={styles.headerUser} onClick={jump2User}>
              <img 
                className={styles.headerAvatar} 
                src={userInfo.avatar || 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'} 
                alt="头像"
              />
              <span>{userInfo.nickName || '微信用户'}</span>
            </div>
          ) : (
            <div className={styles.loginBox}>
              <div className={styles.headerUser}>
                <img 
                  className={styles.headerAvatar} 
                  src={'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'} 
                  alt="头像"
                />
                <span>请登录</span>
              </div>
              <div style={{ marginTop: 12 }}>
                <appkit-button></appkit-button>
              </div>
            </div>
          )}
          
          <div className={styles.headerSelect}>
            <div className={styles.headerSelectItem} onClick={() => jump2Market('own')}>
              <span style={{fontSize: '30px'}}>➕</span>
              <div className={styles.headerSelectText}>我的自选</div>
            </div>
            <div className={styles.headerSelectItem} onClick={() => jump2NoTab('mywarn')}>
              <span style={{fontSize: '30px'}}>🔔</span>
              <div className={styles.headerSelectText}>我的报警</div>
            </div>
            <div className={styles.headerSelectItem} onClick={attendUs}>
              <span style={{fontSize: '30px', color: '#04be02'}}>💬</span>
              <div className={styles.headerSelectText}>关注公众号</div>
            </div>
          </div>
        </div>
        
        <div className={styles.footer}>
          <List className={styles.footerList}>
            {footerList.map((item, index) => (
              <List.Item 
                key={index}
                className={`${styles.footerItem} ${index === footerList.length - 1 ? styles.last : ''}`}
                onClick={item.callback}
              >
                <div className={styles.footerBtn}>
                  <div className={styles.icon}>{item.icon}</div>
                  <div className={styles.text}>{item.text}</div>
                  <div className={styles.extra}>{item.extra}</div>
                </div>
              </List.Item>
            ))}
          </List>
          <Button block onClick={logout}>退出登录</Button>
        </div>
        
        <Popup
          visible={popVis}
          onMaskClick={() => setPopVis(false)}
          onClose={() => setPopVis(false)}
          position='bottom'
          bodyStyle={{ borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}
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
              <div>根据您的使用经历，请问您有多大可能向您的朋友推荐Mozi行情助手</div>
              <div className={styles.scoreDesc}>
                <span>极不愿意</span>
                <span>非常愿意</span>
              </div>
              <Grid className={styles.scoreList} columns={10} gap={5}>
                {[1,2,3,4,5,6,7,8,9,10].map((item) => (
                  <Grid.Item 
                    key={item}
                    className={`${styles.scoreItem} ${item === reportScore ? styles.scoreActive : ''}`} 
                    onClick={() => scoreReport(item)}
                  >
                    {item}
                  </Grid.Item>
                ))}
              </Grid>
              <div className={styles.scoreCon}>
                <div>
                  <span>更多反馈</span>
                  <span className={styles.scoreConDesc}>（选填）</span>
                </div>
                <TextArea 
                  className={styles.scoreText} 
                  placeholder='感谢反馈，期待您更多的建议' 
                  maxLength={200} 
                  onChange={getTextValue}
                  rows={4}
                />
              </div>
              <Button 
                className={`${styles.scoreBtn} ${scoreDisable ? styles.scoreBtnDisable : ''}`} 
                onClick={confirmScore} 
                disabled={scoreDisable}
                block
              >
                提交
              </Button>
            </div>
          )}
          
          {popType === 'contact' && (
            <div className={`${styles.popContainer} ${styles.contactContainer}`}>
              <div className={styles.contactTitle}>欢迎联系我们</div>
              <div className={styles.contactEmail}>
                <span>{EMAIL}</span>
                <div className={styles.contactCopy} onClick={() => copy(EMAIL)}>
                  📋
                </div>
              </div>
            </div>
          )}
          
          {popType === 'attend' && (
            <div className={styles.popContainer}>
              <div className={styles.contactTitle}>欢迎关注我们的公众号</div>
              <img
                className={styles.attendPic}
                src='https://image-1317406749.cos.ap-shanghai.myqcloud.com/wechat_account.jpg'
                alt="公众号二维码"
              />
            </div>
          )}
          
          {popType === 'reward' && (
            <div className={styles.scrollContainer}>
              <div className={styles.contactTitle}>如果觉着好用，欢迎打赏支持</div>
              <div className={styles.rewardScrollBox}>
                <div className={styles.rewardBox}>
                  <img
                    className={styles.attendPic}
                    src='https://image-1317406749.cos.ap-shanghai.myqcloud.com/wechat_pay.jpg'
                    alt="微信支付"
                  />
                </div>
                <div className={styles.rewardBox}>
                  <img
                    className={styles.attendPic}
                    src='https://image-1317406749.cos.ap-shanghai.myqcloud.com/BTC-simple.jpg'
                    alt="BTC地址"
                  />
                  <div className={styles.contactEmail}>
                    <span className={styles.coinKey}>{COINKEY.BTC}</span>
                    <div className={styles.contactCopy} onClick={() => copy(COINKEY.BTC)}>
                      📋
                    </div>
                  </div>
                </div>
                <div className={styles.rewardBox}>
                  <img
                    className={styles.attendPic}
                    src='https://image-1317406749.cos.ap-shanghai.myqcloud.com/ETH-simple.jpg'
                    alt="ETH地址"
                  />
                  <div className={styles.contactEmail}>
                    <span>{COINKEY.ETH}</span>
                    <div className={styles.contactCopy} onClick={() => copy(COINKEY.ETH)}>
                      📋
                    </div>
                  </div>
                </div>
                <div className={styles.rewardBox}>
                  <img
                    className={styles.attendPic}
                    src='https://image-1317406749.cos.ap-shanghai.myqcloud.com/Tron-simple.jpg'
                    alt="Tron地址"
                  />
                  <div className={styles.contactEmail}>
                    <span>{COINKEY.TRON}</span>
                    <div className={styles.contactCopy} onClick={() => copy(COINKEY.TRON)}>
                      📋
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Popup>
      </div>
    </Layout>
  );
}