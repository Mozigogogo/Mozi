import React, { useEffect, useState, useRef } from 'react';
import { Popup, Grid, Button, Toast } from 'antd-mobile';
import styles from '@/app/user/page.module.less';
import pcStyles from './FeedbackPopupPc.module.less';
import { submitFeedback } from '@/api/user';
import { forceBlurAndResetViewport } from '@/utils/iosViewportFix';

const FeedbackPopup = ({ visible, onClose, t, setShowLoginModal, setShowSuccessModal }) => {
  const isPC = typeof window !== 'undefined' && window.innerWidth >= 1024;
  const s = isPC ? pcStyles : styles;
  const scoreGap = isPC ? 10 : 5;
  const [reportScore, setReportScore] = useState(null);
  const [scoreDisable, setScoreDisable] = useState(true);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [selectedGoodFeatures, setSelectedGoodFeatures] = useState([]);
  const [selectedBadFeatures, setSelectedBadFeatures] = useState([]);
  const scoreInputRef = useRef('');

  useEffect(() => {
    if (!isPC) return undefined;
    if (!visible) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isPC, visible]);

  // 切换"您觉得好的功能"选项
  const toggleGoodFeature = (feature) => {
    setSelectedGoodFeatures(prev => {
      if (prev.includes(feature)) {
        return prev.filter(f => f !== feature);
      } else {
        return [...prev, feature];
      }
    });
  };

  // 切换"建议调整的功能"选项
  const toggleBadFeature = (feature) => {
    setSelectedBadFeatures(prev => {
      if (prev.includes(feature)) {
        return prev.filter(f => f !== feature);
      } else {
        return [...prev, feature];
      }
    });
  };

  const onScoreSelect = (scoreValue) => {
    setReportScore(scoreValue);
    setScoreDisable(false);
  };

  const onScoreTextChange = (value) => {
    scoreInputRef.current = value;
  };

  const submitScore = async () => {
    // iOS 修复：强制失焦所有输入框，防止 viewport 缩放问题
    forceBlurAndResetViewport();
    
    // 检查用户是否登录
    const token = localStorage.getItem('token');
    if (!token) {
      // 先关闭反馈弹窗
      onClose();
      // 延迟显示 Toast 和打开登录弹窗，确保 Toast 可见
      setTimeout(() => {
        Toast.show({ content: t('user.pleaseLogin'), position: 'top', duration: 2000 });
        // 再延迟一点打开登录弹窗，让用户看到提示
        setTimeout(() => {
          setShowLoginModal(true);
        }, 500);
      }, 100);
      return;
    }
    
    setSubmittingFeedback(true);
    try {
      const res = await submitFeedback({ 
          score: reportScore, 
          content: scoreInputRef.current,
          goodFeatures: selectedGoodFeatures,
          badFeatures: selectedBadFeatures
        });
      const isSubmitSuccess = res?.data?.isSuccess === true || res?.code === 0 || res?.success === true;
      if (isSubmitSuccess) {
        // 关闭反馈弹窗
        onClose();
        // 显示成功弹窗
        setShowSuccessModal(true);
        // 重置状态
        setReportScore(null);
        setScoreDisable(true);
        scoreInputRef.current = '';
        setSelectedGoodFeatures([]);
        setSelectedBadFeatures([]);
      } else {
        const failReason =
          res?.errorMsg ||
          res?.message ||
          res?.data?.errorMsg ||
          res?.data?.message ||
          t('user.feedbackFailed');
        Toast.show({
          content: isPC ? failReason : t('user.feedbackFailed'),
          position: 'bottom',
        });
      }
    } catch (e) {
      const failReason = e?.errorMsg || e?.message || t('user.feedbackFailed');
      Toast.show({
        content: isPC ? failReason : t('user.feedbackFailed'),
        position: 'bottom',
      });
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const content = (
      <div className={s.scorePopContainer}>
        <div className={s.feedbackTitle}>
          <div>{t('user.feedbackTitle')}</div>
          <div>{t('user.feedbackSubtitle')}</div>
        </div>
        <div className={s.feedbackContent}>
          {/* 功能选择区域 */}
          <div className={s.feedbackSelectSection}>
            {/* 您觉得好的功能 */}
            <div className={s.feedbackSection}>
            <div className={s.feedbackSectionTitle}>{t('user.goodFeatures')}</div>
            <Grid className={s.featureGrid} columns={3} gap={10}>
              {[
                t('user.featureOptions.marketBoard'),
                t('user.featureOptions.alertFunction'),
                t('user.featureOptions.aiChat'),
                t('user.featureOptions.marketData'),
                t('user.featureOptions.communityContent'),
                t('user.featureOptions.contractData')
              ].map((feature) => (
                <Grid.Item key={feature}>
                  <div 
                    className={`${s.featureTag} ${selectedGoodFeatures.includes(feature) ? s.featureTagSelected : ''}`}
                    onClick={() => toggleGoodFeature(feature)}
                  >
                    {feature}
                  </div>
                </Grid.Item>
              ))}
            </Grid>
          </div>

          {/* 建议调整的功能 */}
          <div className={s.feedbackSection}>
            <div className={s.feedbackSectionTitle}>{t('user.badFeatures')}</div>
            <Grid className={s.featureGrid} columns={3} gap={10}>
              {[
                t('user.featureOptions.marketBoard'),
                t('user.featureOptions.alertFunction'),
                t('user.featureOptions.aiChat'),
                t('user.featureOptions.marketData'),
                t('user.featureOptions.communityContent'),
                t('user.featureOptions.contractData')
              ].map((feature) => (
                <Grid.Item key={feature}>
                  <div 
                    className={`${s.featureTag} ${selectedBadFeatures.includes(feature) ? s.featureTagSelected : ''}`}
                    onClick={() => toggleBadFeature(feature)}
                  >
                    {feature}
                  </div>
                </Grid.Item>
              ))}
            </Grid>
          </div>
          </div>

          {/* 积分活动容器 */}
          <div className={s.scoreContainer}>
            <div className={s.scoreRecommendText}>{t('user.recommendQuestion')}</div>
            <div className={s.scoreDesc}>
              <span>{t('user.veryUnwilling')}</span>
              <span>{t('user.veryWilling')}</span>
            </div>
            <Grid className={s.scoreList} columns={10} gap={scoreGap}>
              {[1,2,3,4,5,6,7,8,9,10].map((item) => (
                <Grid.Item key={item} className={`${s.scoreItem} ${item === reportScore ? s.scoreActive : ''}`} onClick={() => onScoreSelect(item)}>
                  {item}
                </Grid.Item>
              ))}
            </Grid>
          </div>
        </div>
        <div className={s.scoreCon}>
          <div>
            <span>{t('user.feedbackInputTitle')}</span>
          </div>
          <textarea 
            className={s.scoreTextArea} 
            placeholder={t('user.feedbackInputPlaceholder')} 
            maxLength={200} 
            onChange={(e) => onScoreTextChange(e.target.value)} 
            rows={4}
          />
        </div>
        <Button 
          className={`${s.scoreBtn} ${scoreDisable ? s.scoreBtnDisable : ''} ${submittingFeedback ? s.loading : ''}`} 
          onClick={submittingFeedback ? undefined : submitScore} 
          disabled={scoreDisable || submittingFeedback} 
          block
        >
          {submittingFeedback ? (
            <span className={s.loadingSpinner}></span>
          ) : (
            t('user.submitFeedback')
          )}
        </Button>
      </div>
  );

  if (isPC) {
    if (!visible) return null;
    return (
      <div
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose?.();
        }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1300,
          background: 'rgba(0,0,0,0.36)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: '760px',
            maxWidth: 'calc(100vw - 48px)',
            maxHeight: 'calc(100vh - 120px)',
            overflow: 'hidden',
            borderRadius: '40PX',
            background: '#fff',
          }}
        >
          {content}
        </div>
      </div>
    );
  }

  return (
    <Popup
      visible={visible}
      onMaskClick={onClose}
      onClose={onClose}
      position="bottom"
      bodyStyle={{
        borderTopLeftRadius: '24px',
        borderTopRightRadius: '24px',
        minHeight: '40vh',
        maxHeight: '90vh',
      }}
    >
      {content}
    </Popup>
  );
};

export default FeedbackPopup;
