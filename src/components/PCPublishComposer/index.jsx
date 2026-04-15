'use client';

import { useEffect, useMemo, useState } from 'react';
import { CameraOutlined, NumberOutlined, PictureOutlined, PlusOutlined } from '@ant-design/icons';
import styles from './index.module.less';

const DEFAULT_AVATAR = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/avatar.png';

export default function PCPublishComposer({
  placeholder = '发布内容..',
  onPublish,
}) {
  const [avatarUrl, setAvatarUrl] = useState(DEFAULT_AVATAR);

  const resolvedAvatar = useMemo(() => {
    const u = String(avatarUrl || '').trim();
    return u || DEFAULT_AVATAR;
  }, [avatarUrl]);

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const token = localStorage.getItem('token');
      if (!token) return;
      const raw = localStorage.getItem('userInfo');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const next =
        parsed?.avatar ||
        parsed?.photoUrl ||
        parsed?.userInfo?.avatar ||
        parsed?.user?.avatar;
      if (next) setAvatarUrl(next);
    } catch (_) {
      // keep default avatar
    }
  }, []);

  return (
    <div className={styles.composer}>
      <img
        className={styles.avatar}
        src={resolvedAvatar}
        alt="avatar"
        onError={(e) => {
          // avoid broken image icon
          e.currentTarget.src = DEFAULT_AVATAR;
        }}
      />

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
