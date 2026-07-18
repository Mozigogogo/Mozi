'use client';

import { useState } from 'react';
import { Dropdown, message } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { deleteAgentConversation } from '@/api/ai';
import { confirm } from '@/components/Modal/confirm';
import styles from './AiConversationRowMenu.module.less';

function VerticalDotsIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="3.5" r="1.25" fill="currentColor" />
      <circle cx="8" cy="8" r="1.25" fill="currentColor" />
      <circle cx="8" cy="12.5" r="1.25" fill="currentColor" />
    </svg>
  );
}

export default function AiConversationRowMenu({
  conversationId,
  onDeleted,
  buttonClassName = '',
  dropdownClassName = '',
  deleteMenuItemClassName = '',
  wrapClassName = '',
  iconSize = 16,
  variant = 'default',
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const isMobile = variant === 'mobile';

  const handleDelete = async () => {
    setOpen(false);
    const confirmed = await confirm({
      content: t('common.confirmDelete'),
      confirmText: t('common.confirm'),
      cancelText: t('common.cancel'),
    });
    if (!confirmed) return;

    try {
      const res = await deleteAgentConversation(conversationId);
      if (res?.code === 0) {
        onDeleted?.(conversationId);
        return;
      }
      message.error(res?.errorMsg || res?.message || t('common.deleteFailed'));
    } catch (error) {
      message.error(error?.errorMsg || error?.message || t('common.deleteFailed'));
    }
  };

  return (
    <div
      className={`${styles.menuWrap} ${isMobile ? styles.menuWrapMobile : ''} ${wrapClassName}`.trim()}
      onClick={(event) => event.stopPropagation()}
    >
      <Dropdown
        open={open}
        onOpenChange={setOpen}
        trigger={['click']}
        placement="bottomRight"
        getPopupContainer={() => (typeof document !== 'undefined' ? document.body : undefined)}
        styles={isMobile ? { root: { zIndex: 1200 } } : undefined}
        menu={{
          items: [
            {
              key: 'delete',
              label: (
                <span
                  className={`${styles.deleteMenuItem} ${
                    isMobile ? styles.deleteMenuItemMobile : ''
                  } ${deleteMenuItemClassName}`.trim()}
                >
                  <DeleteOutlined />
                  <span>{t('common.delete')}</span>
                </span>
              ),
            },
          ],
          onClick: ({ key, domEvent }) => {
            domEvent?.stopPropagation?.();
            if (key === 'delete') {
              handleDelete();
            }
          },
        }}
        classNames={{
          root: `${styles.dropdown} ${
            isMobile ? styles.dropdownMobile : ''
          } ${dropdownClassName}`.trim(),
        }}
      >
        <button
          type="button"
          className={`${styles.menuBtn} ${open ? styles.menuBtnOpen : ''} ${
            isMobile ? styles.menuBtnAlwaysVisible : ''
          } ${isMobile ? styles.menuBtnMobile : ''} ${buttonClassName}`.trim()}
          aria-label={t('common.moreActions', { defaultValue: '更多操作' })}
        >
          <VerticalDotsIcon size={iconSize} />
        </button>
      </Dropdown>
    </div>
  );
}
