import AppLink from '@/components/AppLink';
import GetStartedArrow from '@/components/Icons/GetStartedArrow';
import styles from './PromoCopy.module.css';

export default function PromoCopy({ title, subtitle, href, ctaText, className = '' }) {
  return (
    <div className={`${styles.promoCopy} ${className}`.trim()}>
      <h2 className={styles.promoTitle}>
        {title.map((line, index) => (
          <span key={line}>
            {index > 0 && <br />}
            {line}
          </span>
        ))}
      </h2>
      <p className={styles.promoSubtitle}>
        {subtitle.map((line, index) => (
          <span key={line}>
            {index > 0 && <br />}
            {line}
          </span>
        ))}
      </p>
      <div className={styles.ctaRow}>
        <AppLink className={styles.primaryCta} href={href}>
          <span>{ctaText}</span>
          <GetStartedArrow />
        </AppLink>
      </div>
    </div>
  );
}
