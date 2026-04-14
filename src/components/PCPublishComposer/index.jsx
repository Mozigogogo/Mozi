'use client';

import { CameraOutlined, NumberOutlined, PictureOutlined, PlusOutlined } from '@ant-design/icons';
import styles from './index.module.less';

export default function PCPublishComposer({
  placeholder = '发布内容..',
  onPublish,
}) {
  return (
    <div className={styles.composer}>
      <div className={styles.avatar} aria-hidden />

      <div className={styles.main}>
        <div className={styles.placeholder}>{placeholder}</div>

        <div className={styles.toolbar}>
          <button type="button" className={styles.toolBtn} aria-label="camera">
            <CameraOutlined />
          </button>
          <button type="button" className={styles.toolBtn} aria-label="topic">
            <NumberOutlined />
          </button>
          <button type="button" className={styles.toolBtn} aria-label="image">
            <PictureOutlined />
          </button>
        </div>
      </div>

      <button type="button" className={styles.publishBtn} onClick={onPublish}>
        <PlusOutlined />
        <span>发布</span>
      </button>
    </div>
  );
}
