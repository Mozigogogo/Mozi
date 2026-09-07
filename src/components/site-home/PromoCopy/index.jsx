import Link from 'next/link';
import GetStartedArrow from '@/components/Icons/GetStartedArrow';
import styles from './PromoCopy.module.css';

/**
 * 营销页文案块：服务端可渲染，CTA 使用真实 <a>（Next Link），避免空壳/不可抓链接。
 */
export default function PromoCopy({
  title,
  subtitle,
  ctaText,
  href = '/home',
  className = '',
  titleAs: TitleTag = 'h2',
}) {
  return (
    <div className={`${styles.promoCopy} ${className}`.trim()}>
      <TitleTag className={styles.promoTitle}>
        {title.map((line, index) => (
          <span key={line}>
            {index > 0 && <br />}
            {line}
          </span>
        ))}
      </TitleTag>
      <p className={styles.promoSubtitle}>
        {subtitle.map((line, index) => (
          <span key={line}>
            {index > 0 && <br />}
            {line}
          </span>
        ))}
      </p>
      <div className={styles.ctaRow}>
        <Link className={styles.primaryCta} href={href}>
          <span>{ctaText}</span>
          <GetStartedArrow />
        </Link>
      </div>
    </div>
  );
}
