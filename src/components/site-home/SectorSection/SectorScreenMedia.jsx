import styles from './SectorSection.module.css';

const COS_HOME = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/homesite';
const SECTOR_WEBM_SRC = `${COS_HOME}/sector.webm`;
const SECTOR_MP4_SRC = `${COS_HOME}/sector.mp4`;

export default function SectorScreenMedia() {
  return (
    <div className={styles.sectorPreview}>
      <video
        className={`${styles.sectorPreviewImage} ${styles.sectorPreviewImageReady}`}
        width={702}
        height={401}
        muted
        loop
        playsInline
        autoPlay
        preload="auto"
        aria-label="MoziInnovations sector rotation heatmap to find leading crypto market sectors"
      >
        <source src={SECTOR_WEBM_SRC} type="video/webm" />
        <source src={SECTOR_MP4_SRC} type="video/mp4" />
      </video>
    </div>
  );
}
