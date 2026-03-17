import React from 'react';
import styles from '@/app/pointsdetail/page.module.less';
import DeferredImg from './DeferredImg';

export default function SectionHeader({ iconSrc, iconAlt = '', title }) {
  return (
    <div className={styles.inviteCardHeader}>
      <DeferredImg src={iconSrc} className={styles.inviteIcon} alt={iconAlt} width={52} height={52} />
      <div className={styles.inviteTitleContainer}>
        <span className={styles.inviteTitle}>{title}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="100%"
          height="5"
          viewBox="0 0 70 5"
          fill="none"
          preserveAspectRatio="none"
          className={styles.inviteTitleUnderline}
        >
          <path
            d="M0 2.5C0 1.11929 1.11929 0 2.5 0H67.5C68.8807 0 70 1.11929 70 2.5C70 3.88071 68.8807 5 67.5 5H2.5C1.11929 5 0 3.88071 0 2.5Z"
            fill="#FCCB37"
          />
        </svg>
      </div>
    </div>
  );
}

