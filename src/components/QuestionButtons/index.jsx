'use client';

import styles from './index.module.less';

const answerQuestionImg = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/community/answer-question.png';
const submitQuestionImg = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/community/submit-question.png';

export default function QuestionButtons({ onAskQuestion, onAnswerQuestion }) {
  return (
    <div className={styles.questionActionBar}>
      <div className={`${styles.actionButton} ${styles.askButton}`} onClick={onAskQuestion}>
        <img className={styles.buttonIcon} src={submitQuestionImg} alt="提问" />
        <span className={styles.buttonText}>提个问题</span>
      </div>
      <div className={`${styles.actionButton} ${styles.answerButton}`} onClick={onAnswerQuestion}>
        <img className={styles.buttonIcon} src={answerQuestionImg} alt="回答" />
        <span className={styles.buttonText}>回答问题</span>
      </div>
    </div>
  );
}
