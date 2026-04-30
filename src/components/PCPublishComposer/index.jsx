'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { PictureOutlined, PlusOutlined } from '@ant-design/icons';
import { message } from 'antd';
import { useTranslation } from 'react-i18next';
import { request } from '@/utils/request';
import { Interface } from '@/utils/constants';
import styles from './index.module.less';

const DEFAULT_AVATAR = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/avatar.png';

export default function PCPublishComposer({
  placeholder,
  onPublish,
}) {
  const { t } = useTranslation();
  const [avatarUrl, setAvatarUrl] = useState(DEFAULT_AVATAR);
  const [content, setContent] = useState('');
  const [images, setImages] = useState([]);
  const [publishing, setPublishing] = useState(false);
  const uploadInputRef = useRef(null);
  const composerPlaceholder = placeholder || t('pcCommunity.publishPlaceholder');

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

  const handleImageToolClick = () => {
    uploadInputRef.current?.click();
  };

  const handleImagePicked = async (e) => {
    const fileList = Array.from(e.target.files || []);
    if (fileList.length === 0) return;
    const remain = Math.max(0, 9 - images.length);
    if (remain <= 0) {
      message.warning(t('post.messages.uploadLimit', { defaultValue: '最多只能上传9张图片' }));
      e.target.value = '';
      return;
    }
    const files = fileList.slice(0, remain);

    try {
      const loadingKey = 'pc-composer-uploading';
      message.loading({ key: loadingKey, content: t('post.messages.uploading'), duration: 0 });
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
      const uploaded = await Promise.all(
        files.map(async (file) => {
          const formData = new FormData();
          formData.append('file', file);
          const response = await fetch(`/api${Interface.UPLOAD_FILE}`, {
            method: 'POST',
            headers: {
              authentication: token || '',
            },
            body: formData,
          });
          const data = await response.json();
          if (data?.code === 0 && data?.data) return data.data;
          return null;
        })
      );
      const validUrls = uploaded.filter(Boolean);
      setImages((prev) => [...prev, ...validUrls].slice(0, 9));
      message.success({
        key: loadingKey,
        content:
          validUrls.length > 0
            ? t('post.messages.uploadSuccess', { count: validUrls.length })
            : t('post.messages.uploadFailed'),
      });
    } catch (_) {
      message.error(t('post.messages.uploadFailed'));
    } finally {
      e.target.value = '';
    }
  };

  const handleRemoveImage = (idx) => {
    setImages((prev) => prev.filter((_, index) => index !== idx));
  };

  const handlePublish = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    if (!token) {
      message.warning(t('post.messages.pleaseLogin'));
      return;
    }
    const trimmed = String(content || '').trim();
    if (!trimmed && images.length === 0) {
      message.warning(t('post.messages.publishContentRequired', { defaultValue: '请输入内容或上传图片' }));
      return;
    }
    try {
      setPublishing(true);
      const response = await request({
        url: Interface.POST_NEW,
        method: 'POST',
        data: {
          title: '',
          content: trimmed,
          category: '普通',
          topicIds: [],
          tags: [],
          images,
        },
      });
      if (response?.code === 0) {
        message.success(t('post.messages.publishSuccess'));
        setContent('');
        setImages([]);
        onPublish?.();
      } else {
        message.error(t('post.messages.publishFailed'));
      }
    } catch (_) {
      message.error(t('post.messages.publishFailed'));
    } finally {
      setPublishing(false);
    }
  };

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
        <textarea
          className={styles.textarea}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={composerPlaceholder}
          maxLength={500}
        />

        {images.length > 0 && (
          <div className={styles.imageList}>
            {images.map((src, idx) => (
              <div key={`${src}-${idx}`} className={styles.imageItem}>
                <img className={styles.imageThumb} src={src} alt="" />
                <button type="button" className={styles.removeImageBtn} onClick={() => handleRemoveImage(idx)}>
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className={styles.toolbar}>
          <button type="button" className={styles.toolBtn} aria-label="image" onClick={handleImageToolClick}>
            <PictureOutlined />
          </button>
          <input
            ref={uploadInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={handleImagePicked}
          />
        </div>
      </div>

      <button type="button" className={styles.publishBtn} onClick={handlePublish} disabled={publishing}>
        <PlusOutlined />
        <span>{t('post.buttons.publish')}</span>
      </button>
    </div>
  );
}
