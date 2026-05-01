import Image from 'next/image';
import styles from './SectorSection.module.css';
import PromoCopy from '../PromoCopy/index';

export default function SectorSection() {
  return (
    <section className={styles.sectorSection}>
      <div className={styles.sectorCols}>
        <div className={styles.sectorLeftPane}>
          <PromoCopy
            className={styles.sectorLeft}
            title={['Sector', 'Rotation']}
            subtitle={['Ride the trend. One-click', 'to find the sector leaders']}
            href="/pc/find"
            ctaText="Enter Mozi"
          />
        </div>

        <div className={styles.sectorRightPane} aria-hidden="true">
          <div className={styles.sectorPreview}>
            <Image
              src="/images/pc/introduction3.svg"
              alt=""
              fill
              className={styles.sectorPreviewImage}
              sizes="(max-width: 1024px) 90vw, 44vw"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
