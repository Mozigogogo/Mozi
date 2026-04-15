'use client';

import { useEffect, useMemo, useState } from 'react';
import { Toast } from 'antd-mobile';
import { useRouter, useSearchParams } from 'next/navigation';
import NavBar from '@/components/NavBar';
import PCLayout from '@/components/PCLayout';
import styles from './page.module.less';

const REPORT_TYPES = [
  '攻击谩骂',
  '色情低俗',
  '违法信息',
  '政治敏感',
  '营销广告',
  '无意义内容',
  '虚假谣言',
];

export default function CommentReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedType, setSelectedType] = useState(REPORT_TYPES[0]);
  const [submitting, setSubmitting] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const updateIsDesktop = () => setIsDesktop(mediaQuery.matches);
    updateIsDesktop();
    mediaQuery.addEventListener('change', updateIsDesktop);
    return () => mediaQuery.removeEventListener('change', updateIsDesktop);
  }, []);

  const payloadPreview = useMemo(
    () => ({
      postId: searchParams.get('postId') || '',
      authorId: searchParams.get('authorId') || '',
      reportType: selectedType,
    }),
    [searchParams, selectedType]
  );

  const handleSubmit = async () => {
    if (!selectedType) {
      Toast.show({ content: '请选择举报类型', position: 'bottom' });
      return;
    }
    setSubmitting(true);
    try {
      // 预留：后续接入真实举报接口
      console.log('[report][comment] submit payload:', payloadPreview);
      Toast.show({ content: '举报提交成功', position: 'bottom' });
      router.back();
    } catch (error) {
      console.error('[report][comment] submit failed:', error);
      Toast.show({ content: '提交失败，请稍后重试', position: 'bottom' });
    } finally {
      setSubmitting(false);
    }
  };

  const pageContent = (
    <div className={styles.page}>
      {!isDesktop ? (
        <NavBar
          title="评论举报"
          showBorder={false}
          fixed={false}
        />
      ) : null}

      <div className={styles.content}>
        <section className={styles.card}>
          <div className={styles.sectionHeader}>
            {isDesktop ? (
              <div
                className={styles.backButton}
                onClick={() => router.back()}
                role="button"
                tabIndex={0}
                aria-label="返回上一页"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    router.back();
                  }
                }}
              >
                <span aria-hidden>←</span>
              </div>
            ) : null}
            <div className={styles.sectionTitle}>选择举报的类型</div>
          </div>
          <div className={styles.typeGrid}>
            {REPORT_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                className={`${styles.typeBtn} ${selectedType === type ? styles.typeBtnActive : ''}`}
                onClick={() => setSelectedType(type)}
              >
                {type}
              </button>
            ))}
          </div>
        </section>

      </div>

      <div className={styles.footer}>
        <button
          type="button"
          className={styles.submitBtn}
          disabled={submitting}
          onClick={handleSubmit}
        >
          {submitting ? '提交中...' : '我要举报'}
        </button>
      </div>
    </div>
  );

  if (isDesktop) {
    return (
      <PCLayout>
        <div className={styles.pcContentArea}>{pageContent}</div>
      </PCLayout>
    );
  }

  return pageContent;
}
