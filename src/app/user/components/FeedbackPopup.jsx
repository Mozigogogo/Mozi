import React, { useState, useRef } from 'react';
import { Popup, Grid, Button, Toast } from 'antd-mobile';
import styles from '@/app/user/page.module.less';
import { submitFeedback } from '@/api/user';
import { forceBlurAndResetViewport } from '@/utils/iosViewportFix';

const FeedbackPopup = ({ visible, onClose, t, setShowLoginModal, setShowSuccessModal }) => {
  const [reportScore, setReportScore] = useState(null);
  const [scoreDisable, setScoreDisable] = useState(true);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [selectedGoodFeatures, setSelectedGoodFeatures] = useState([]);
  const [selectedBadFeatures, setSelectedBadFeatures] = useState([]);
  const scoreInputRef = useRef('');

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
      if (res?.data?.isSuccess) {
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
        Toast.show({ content: t('user.feedbackFailed'), position: 'bottom' });
      }
    } catch (e) {
      Toast.show({ content: t('user.feedbackFailed'), position: 'bottom' });
    } finally {
      setSubmittingFeedback(false);
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
        minHeight: '40vh',
        maxHeight: '90vh',
      }}
    >
      <div className={styles.scorePopContainer}>
        <div className={styles.feedbackTitle}>
          <div>{t('user.feedbackTitle')}</div>
          <div>{t('user.feedbackSubtitle')}</div>
        </div>
        <div className={styles.feedbackContent}>
          {/* 功能选择区域 */}
          <div className={styles.feedbackSelectSection}>
            {/* 您觉得好的功能 */}
            <div className={styles.feedbackSection}>
            <div className={styles.feedbackSectionTitle}>{t('user.goodFeatures')}</div>
            <Grid className={styles.featureGrid} columns={3} gap={10}>
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
                    className={`${styles.featureTag} ${selectedGoodFeatures.includes(feature) ? styles.featureTagSelected : ''}`}
                    onClick={() => toggleGoodFeature(feature)}
                  >
                    {feature}
                  </div>
                </Grid.Item>
              ))}
            </Grid>
          </div>

          {/* 建议调整的功能 */}
          <div className={styles.feedbackSection}>
            <div className={styles.feedbackSectionTitle}>{t('user.badFeatures')}</div>
            <Grid className={styles.featureGrid} columns={3} gap={10}>
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
                    className={`${styles.featureTag} ${selectedBadFeatures.includes(feature) ? styles.featureTagSelected : ''}`}
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
          <div className={styles.scoreContainer}>
            <div className={styles.scoreRecommendText}>{t('user.recommendQuestion')}</div>
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
          </div>
        </div>
        <div className={styles.scoreCon}>
          <div>
            <span>{t('user.feedbackInputTitle')}</span>
          </div>
          <textarea 
            className={styles.scoreTextArea} 
            placeholder={t('user.feedbackInputPlaceholder')} 
            maxLength={200} 
            onChange={(e) => onScoreTextChange(e.target.value)} 
            rows={4}
          />
        </div>
        <Button 
          className={`${styles.scoreBtn} ${scoreDisable ? styles.scoreBtnDisable : ''} ${submittingFeedback ? styles.loading : ''}`} 
          onClick={submittingFeedback ? undefined : submitScore} 
          disabled={scoreDisable || submittingFeedback} 
          block
        >
          {submittingFeedback ? (
            <span className={styles.loadingSpinner}></span>
          ) : (
            t('user.submitFeedback')
          )}
        </Button>
      </div>
    </Popup>
  );
};

export default FeedbackPopup;
