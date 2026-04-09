'use client';

import { useMemo, useState } from 'react';
import RightArrowIcon from '../Icons/RightArrowIcon';
import styles from './index.module.less';

const DEFAULT_TAGS = [
  '合规从业者',
  '专职交易员',
  '量化研究员',
  '内容创作者',
  '社区运营',
  '机构从业者',
];

const TAG_ICON_MAP = {
  合规从业者: '/icons/pc/tag1.svg',
  专职交易员: '/icons/pc/tag2.svg',
  量化研究员: '/icons/pc/tag3.svg',
  内容创作者: '/icons/pc/tag4.svg',
  社区运营: '/icons/pc/tag5.svg',
  机构从业者: '/icons/pc/tag6.svg',
};

export default function UserProfilePanelPopup({
  open,
  onClose,
  onSave,
  onLogout,
  initialData,
}) {
  const data = useMemo(
    () => ({
      name: initialData?.name || '用户名',
      account: initialData?.account || '账号账号账号号',
      bio: initialData?.bio || '资金流动大师，金融NO.1',
      email: initialData?.email || 'carlakorsgaard@gmail.com',
      phone: initialData?.phone || '+8234567900',
      commission: initialData?.commission || 'TronUSDTbinubho',
      avatar: initialData?.avatar || 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/avatar.png',
      boundTelegram: initialData?.boundTelegram ?? true,
      boundWallet: initialData?.boundWallet ?? false,
      language: initialData?.language || '中文（中国）',
      selectedTag: initialData?.selectedTag || '内容创作者',
    }),
    [initialData]
  );

  const [selectedTag, setSelectedTag] = useState(data.selectedTag);
  const [tagExpanded, setTagExpanded] = useState(true);
  const [languageExpanded, setLanguageExpanded] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(data.language);
  const [bio, setBio] = useState(data.bio);
  const [email, setEmail] = useState(data.email);
  const [phone, setPhone] = useState(data.phone);
  const [commission, setCommission] = useState(data.commission);

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.floatingPanel} onClick={(e) => e.stopPropagation()}>
      <div className={styles.panel}>
        <div className={styles.headerCard}>
          <img src={data.avatar} alt={data.name} className={styles.avatar} />
          <div className={styles.headerRight}>
            <div className={styles.name}>{data.name}</div>
            <div className={styles.account}>{data.account}</div>
            <div className={styles.channelBtn}>查看你的频道</div>
          </div>
        </div>

        <div className={styles.sectionCard}>
          <div className={styles.bindRow}>
            <div className={styles.bindLeft}>
              <img src="/icons/pc/bind_telegram.svg" alt="" />
              <span>Telegham</span>
            </div>
            <div className={styles.boundBtn}>
              {data.boundTelegram ? '已绑定' : '绑定'}
            </div>
          </div>
          <div className={styles.bindRow}>
            <div className={styles.bindLeft}>
              <img src="/icons/pc/wallet.svg" alt="" />
              <span>钱包</span>
            </div>
            <div className={styles.unboundBtn}>
              <img src="/icons/pc/plus.svg" alt="" />
              <span>{data.boundWallet ? '已绑定' : '绑定'}</span>
            </div>
          </div>
        </div>

        <div className={styles.sectionCard}>
          <div
            className={styles.labelRow}
            onClick={() => setTagExpanded((prev) => !prev)}
          >
            <div className={styles.labelTitle}>
              <img src="/icons/new_user/user_tag_90A1B9.svg" alt="" />
              <div>
                <div className={styles.labelMain}>身份标签</div>
                <div className={styles.labelSub}>{selectedTag}</div>
              </div>
            </div>
            <RightArrowIcon
              size={16}
              color="#9ca3af"
              className={`${styles.rowArrow} ${tagExpanded ? styles.rowArrowExpanded : ''}`}
            />
          </div>

          {tagExpanded ? (
            <div className={styles.tagGrid}>
              {DEFAULT_TAGS.map((tag) => (
                <div
                  key={tag}
                  className={`${styles.tagItem} ${selectedTag === tag ? styles.tagActive : ''}`}
                  onClick={() => setSelectedTag(tag)}
                >
                  <img src={TAG_ICON_MAP[tag]} alt="" className={styles.tagIcon} />
                  <div className={styles.tagTextWrap}>
                    <span>{tag}</span>
                    {selectedTag === tag ? <span className={styles.check}>✓</span> : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div className={styles.formRow}>
            <img src="/icons/pc/user_icon.svg" alt="" />
            <div className={styles.formField}>
              <div className={styles.formLabel}>个人简介</div>
              <input value={bio} onChange={(e) => setBio(e.target.value)} />
            </div>
          </div>
          <div className={styles.formRow}>
            <img src="/icons/pc/email.svg" alt="" />
            <div className={styles.formField}>
              <div className={styles.formLabel}>告警邮件</div>
              <input value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div className={styles.formRow}>
            <img src="/icons/pc/phone.svg" alt="" />
            <div className={styles.formField}>
              <div className={styles.formLabel}>告警电话</div>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <div className={styles.formRow}>
            <img src="/icons/pc/earn.svg" alt="" />
            <div className={styles.formField}>
              <div className={styles.formLabel}>获取分佣</div>
              <input value={commission} onChange={(e) => setCommission(e.target.value)} />
            </div>
          </div>
        </div>

        <div
          className={styles.logoutBtn}
          onClick={() => onLogout?.()}
        >
          <img src="/icons/pc/logout.svg" alt="" className={styles.logoutIcon} />
          <span>退出账号</span>
        </div>

        <div className={styles.sectionCard}>
          <div className={styles.bottomRow} onClick={() => onSave?.()}>
            <div className={styles.bottomLeft}>
              <img src="/icons/pc/vip.svg" alt="" />
              <span>订阅内容和会员</span>
            </div>
          </div>
          <div
            className={styles.bottomRow}
            onClick={() => setLanguageExpanded((prev) => !prev)}
          >
            <div className={styles.bottomLeft}>
              <img src="/icons/pc/language.svg" alt="" />
              <span>语言：{selectedLanguage}</span>
            </div>
            <RightArrowIcon
              size={16}
              color="#9ca3af"
              className={`${styles.rowArrow} ${languageExpanded ? styles.rowArrowExpanded : ''}`}
            />
          </div>
          {languageExpanded ? (
            <div className={styles.languagePanel}>
              <div
                className={styles.languageItem}
                onClick={() => setSelectedLanguage('中文（中国）')}
              >
                中文（中国）
              </div>
              <div
                className={styles.languageItem}
                onClick={() => setSelectedLanguage('English')}
              >
                English
              </div>
            </div>
          ) : null}
        </div>
      </div>
      </div>
    </div>
  );
}

