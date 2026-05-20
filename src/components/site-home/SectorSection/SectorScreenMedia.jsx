'use client';

import { useState } from 'react';
import styles from './SectorSection.module.css';

const SECTOR_POSTER_SRC =
  'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/pc/introduction3.svg';
const SECTOR_GIF_SRC =
  'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/new_home/sector.gif';

export default function SectorScreenMedia() {
  const [gifReady, setGifReady] = useState(false);

  return (
    <div className={styles.sectorPreview} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={SECTOR_POSTER_SRC}
        alt=""
        className={`${styles.sectorPoster} ${gifReady ? styles.sectorPosterHidden : ''}`}
        loading="eager"
        decoding="async"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={SECTOR_GIF_SRC}
        alt="Mozi sector rotation preview"
        className={`${styles.sectorPreviewImage} ${gifReady ? styles.sectorPreviewImageReady : ''}`}
        loading="eager"
        decoding="async"
        onLoad={() => setGifReady(true)}
      />
    </div>
  );
}
