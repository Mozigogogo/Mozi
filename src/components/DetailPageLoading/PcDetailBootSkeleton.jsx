import { Skeleton } from '@/components/Skeleton';
import styles from './index.module.less';

const Sk = ({ width, height, borderRadius = 4, style }) => (
  <Skeleton config={{ type: 'element', width, height, borderRadius, style }} />
);

const SkCircle = ({ size }) => <Skeleton config={{ type: 'circle', size }} />;

/** PC 币种详情首屏骨架：对齐 PCCoinDetail + 左 Market/ROI + 中 K 线 + 右大单/社区 */
export default function PcDetailBootSkeleton() {
  return (
    <div className={styles.pcBootLayout} aria-hidden>
      <header className={styles.pcBootTopBar}>
        <div className={styles.pcBootTopLead}>
          <div className={styles.pcBootTopLeft}>
            <SkCircle size={32} />
            <SkCircle size={28} />
            <Sk width={88} height={16} borderRadius={4} />
          </div>
          <div className={styles.pcBootTopPrice}>
            <Sk width={96} height={24} />
            <Sk width={80} height={12} />
          </div>
        </div>
        <div className={styles.pcBootTopMain}>
          <div className={styles.pcBootTopStats}>
            {Array.from({ length: 5 }).map((_, colIndex) => (
              <div key={colIndex} className={styles.pcBootStatGroup}>
                <div className={styles.pcBootStatItem}>
                  <Sk width={48} height={10} />
                  <Sk width={64} height={12} style={{ marginTop: 4 }} />
                </div>
              </div>
            ))}
          </div>
          <div className={styles.pcBootTopActions}>
            {Array.from({ length: 3 }).map((_, i) => (
              <SkCircle key={i} size={28} />
            ))}
            <Sk width={88} height={30} borderRadius={999} />
            <Sk width={88} height={30} borderRadius={999} />
          </div>
        </div>
      </header>

      <div className={styles.pcBootMain}>
        <div className={styles.pcBootRow}>
          <aside className={styles.pcBootSide}>
            <div className={styles.pcBootMarquee}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={styles.pcBootMarqueeItem}>
                  <Sk width={36} height={14} />
                  <Sk width={52} height={14} />
                  <Sk width={40} height={14} />
                </div>
              ))}
            </div>
            <div className={styles.pcBootSideSection}>
              <div className={styles.pcBootSectionTitle}>
                <SkCircle size={8} />
                <Sk width={56} height={16} />
              </div>
              <div className={styles.pcBootMarketHead}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Sk key={i} width={i === 0 ? 72 : 56} height={12} />
                ))}
              </div>
              {Array.from({ length: 4 }).map((_, row) => (
                <div key={row} className={styles.pcBootMarketRow}>
                  <div className={styles.pcBootExchangeCell}>
                    <SkCircle size={18} />
                    <Sk width={64} height={14} />
                  </div>
                  {Array.from({ length: 4 }).map((_, col) => (
                    <Sk key={col} width={52} height={14} />
                  ))}
                </div>
              ))}
            </div>
            <div className={styles.pcBootSideSection}>
              <div className={styles.pcBootSectionTitle}>
                <SkCircle size={8} />
                <Sk width={40} height={16} />
              </div>
              <div className={styles.pcBootRoiGrid}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <Sk key={i} width="100%" height={56} borderRadius={8} />
                ))}
              </div>
            </div>
          </aside>

          <div className={styles.pcBootChart}>
            <div className={styles.pcBootToolbar}>
              <div className={styles.pcBootPeriodPills}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <Sk key={i} width={44} height={28} borderRadius={12} />
                ))}
              </div>
              <div className={styles.pcBootChartTypePills}>
                <Sk width={72} height={28} borderRadius={12} />
                <Sk width={72} height={28} borderRadius={12} />
              </div>
            </div>
            <div className={styles.pcBootChartMain}>
              <Sk width="100%" height="100%" borderRadius={0} />
            </div>
            <div className={styles.pcBootChartSubs}>
              <Sk width="100%" height={72} borderRadius={4} />
              <Sk width="100%" height={72} borderRadius={4} />
            </div>
            <div className={styles.pcBootBarrage}>
              <SkCircle size={36} />
              <Sk width="100%" height={36} borderRadius={8} />
              <Sk width={64} height={36} borderRadius={9} />
            </div>
          </div>

          <aside className={styles.pcBootOrder}>
            <div className={styles.pcBootOrderHalf}>
              <div className={styles.pcBootSectionTitle}>
                <SkCircle size={8} />
                <Sk width={120} height={16} />
              </div>
              <div className={styles.pcBootBookHead}>
                <Sk width={48} height={12} />
                <Sk width={48} height={12} />
                <Sk width={24} height={12} />
              </div>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={styles.pcBootBookRow}>
                  <Sk width={56} height={14} />
                  <Sk width={48} height={14} />
                  <SkCircle size={18} />
                </div>
              ))}
            </div>
            <div className={styles.pcBootOrderHalf}>
              <div className={styles.pcBootSectionTitle}>
                <SkCircle size={8} />
                <Sk width={72} height={16} />
              </div>
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className={styles.pcBootCommunityItem}>
                  <SkCircle size={40} />
                  <div className={styles.pcBootCommunityBody}>
                    <Sk width="42%" height={14} />
                    <Sk width="88%" height={12} style={{ marginTop: 8 }} />
                    <Sk width="70%" height={12} style={{ marginTop: 6 }} />
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
