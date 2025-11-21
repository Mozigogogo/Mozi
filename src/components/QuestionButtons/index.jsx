'use client';

import { useTranslation } from 'react-i18next';
import styles from './index.module.less';

const answerQuestionImg = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/community/answer-question.png';
const submitQuestionImg = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/community/submit-question.png';

export default function QuestionButtons({ onAskQuestion, onAnswerQuestion }) {
  const { t } = useTranslation();
  
  return (
    <div className={styles.questionActionBar}>
      <div className={`${styles.actionButton} ${styles.askButton}`} onClick={onAskQuestion}>
        <img className={styles.buttonIcon} src={submitQuestionImg} alt={t('community.questionButtons.askQuestion')} />
        <span className={styles.buttonText}>{t('community.questionButtons.askQuestion')}</span>
      </div>
      <div className={`${styles.actionButton} ${styles.answerButton}`} onClick={onAnswerQuestion}>
        <img className={styles.buttonIcon} src={answerQuestionImg} alt={t('community.questionButtons.answerQuestion')} />
        <span className={styles.buttonText}>{t('community.questionButtons.answerQuestion')}</span>
      </div>
    </div>
  );
}
