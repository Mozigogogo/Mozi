import styles from './SectorSection.module.css';
import PromoCopy from '../PromoCopy/index';
import SectorScreenMedia from './SectorScreenMedia';

export default function SectorSection() {
  return (
    <section className={styles.sectorSection}>
      <div className={styles.sectorCols}>
        <div className={styles.sectorLeftPane}>
          <PromoCopy
            className={styles.sectorLeft}
            title={['Sector', 'Rotation']}
            subtitle={['Ride the trend. One-click', 'to find the sector leaders']}
            href="/home#sector"
            ctaText="Enter Mozi"
          />
        </div>

        <div className={styles.sectorRightPane}>
          <SectorScreenMedia />
        </div>
      </div>
    </section>
  );
}
