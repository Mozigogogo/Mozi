'use client';

import { useMemo, useState } from 'react';
import BottomSheetModal from '../BottomSheetModal';
import styles from './index.module.less';

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      className={`${styles.toggle} ${checked ? styles.toggleOn : styles.toggleOff} ${disabled ? styles.toggleDisabled : ''}`}
      onClick={() => {
        if (disabled) return;
        onChange?.(!checked);
      }}
      aria-pressed={checked}
    >
      <span className={styles.toggleThumb} />
    </button>
  );
}

function PhoneAlarmIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="6" fill="#E8F5F1"/>
      <path d="M9.5 15H14.5M7 14V5C7 4.448 7.448 4 8 4H16C16.552 4 17 4.448 17 5V14C17 14.552 16.552 15 16 15H8C7.448 15 7 14.552 7 14Z" stroke="#11B787" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="17" cy="7" r="3" fill="#11B787"/>
    </svg>
  );
}

function MailAlarmIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="6" fill="#E8F5F1"/>
      <path d="M5 8L12 12L19 8M5 8V16C5 16.552 5.448 17 6 17H18C18.552 17 19 16.552 19 16V8M5 8C5 7.448 5.448 7 6 7H18C18.552 7 19 7.448 19 8" stroke="#11B787" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function PushAlarmIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="6" fill="#FFF3E0"/>
      <path d="M12 18C12.83 18 13.5 17.33 13.5 16.5H10.5C10.5 17.33 11.17 18 12 18Z" fill="#FFA726"/>
      <path d="M16 13V10C16 7.79 14.21 6 12 6C9.79 6 8 7.79 8 10V13L6.5 14.5V15H17.5V14.5L16 13Z" stroke="#FFA726" strokeWidth="1.2" strokeLinejoin="round"/>
      <circle cx="16" cy="7" r="2" fill="#FFA726"/>
    </svg>
  );
}

function PhoneInputIcon() {
  return (
    <svg width="14" height="16" viewBox="0 0 14 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5.75 11.86H8.25M2.6 10.96V1.96C2.6 0.964 3.406 0.159 4.4 0.159H9.6C10.594 0.159 11.4 0.964 11.4 1.96V10.96C11.4 11.954 10.594 12.759 9.6 12.759H4.4C3.406 12.759 2.6 11.954 2.6 10.96Z" stroke="#999999" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function MailInputIcon() {
  return (
    <svg width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15.5 0.409H2.5C1.5 0.409 0.67 1.283 0.67 2.409V11.891C0.67 13.071 1.626 14.027 2.806 14.027H15.195C16.375 14.027 17.33 13.071 17.33 11.891V2.562C17.33 1.509 16.568 0.635 15.566 0.459C15.544 0.426 15.522 0.409 15.5 0.409ZM16.084 11.891C16.084 12.382 15.685 12.781 15.195 12.781H2.806C2.315 12.781 1.916 12.382 1.916 11.891V2.562C1.916 2.505 1.922 2.449 1.932 2.394L6.801 6.932C7.28 7.378 7.89 7.601 8.5 7.601C9.11 7.601 9.72 7.378 10.199 6.932L15.068 2.394C15.078 2.448 15.084 2.505 15.084 2.562V11.891Z" fill="#999999"/>
    </svg>
  );
}

export default function OneClickAlarmModal({
  open = false,
  onClose,
  onConfirm,
  onSkip,
  title = '一键告警',
  subtitle = '实时监控 即时提醒',
  confirmText = '开启告警',
  skipText = '暂不开启',
  initialValue,
}) {
  const init = useMemo(
    () => ({
      phoneEnabled: true,
      countryCode: '+86',
      phone: '',
      emailEnabled: false,
      email: '',
      pushEnabled: false,
      ...(initialValue || {}),
    }),
    [initialValue]
  );

  const [phoneEnabled, setPhoneEnabled] = useState(init.phoneEnabled);
  const [countryCode, setCountryCode] = useState(init.countryCode);
  const [phone, setPhone] = useState(init.phone);
  const [emailEnabled, setEmailEnabled] = useState(init.emailEnabled);
  const [email, setEmail] = useState(init.email);
  const [pushEnabled, setPushEnabled] = useState(init.pushEnabled);

  const footer = (
    <div className={styles.footerActions}>
      <button
        type="button"
        className={styles.primaryBtn}
        onClick={() => {
          onConfirm?.({
            phoneEnabled,
            countryCode,
            phone,
            emailEnabled,
            email,
            pushEnabled,
          });
        }}
      >
        {confirmText}
      </button>
      <button
        type="button"
        className={styles.secondaryBtn}
        onClick={() => {
          onSkip?.();
          onClose?.();
        }}
      >
        {skipText}
      </button>
    </div>
  );

  return (
    <BottomSheetModal
      open={open}
      onClose={onClose}
      header={
        <div className={styles.header}>
        </div>
      }
      footer={footer}
      sheetClassName={styles.sheet}
      maxHeight="90vh"
    >
      <div className={styles.content}>
        <div className={styles.card}>
          <div className={styles.row}>
            <div className={styles.rowLeft}>
              <span className={styles.icon}><PhoneAlarmIcon /></span>
              <span className={styles.rowLabel}>电话告警</span>
            </div>
            <Toggle checked={phoneEnabled} onChange={setPhoneEnabled} />
          </div>

          <div className={`${styles.inputRow} ${!phoneEnabled ? styles.inputRowDisabled : ''}`}>
            <span className={styles.inputIcon}><PhoneInputIcon /></span>
            <div className={styles.countryCodeWrap}>
              <select
                className={styles.countrySelect}
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                disabled={!phoneEnabled}
              >
                <option value={'+86'}>+86</option>
                <option value={'+1'}>+1</option>
                <option value={'+81'}>+81</option>
                <option value={'+82'}>+82</option>
                <option value={'+852'}>+852</option>
                <option value={'+853'}>+853</option>
                <option value={'+886'}>+886</option>
              </select>
            </div>
            <input
              className={styles.input}
              placeholder="请输入手机号"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={!phoneEnabled}
              inputMode="tel"
            />
          </div>

          <div className={styles.divider} />

          <div className={styles.row}>
            <div className={styles.rowLeft}>
              <span className={styles.icon}><MailAlarmIcon /></span>
              <span className={styles.rowLabel}>邮件告警</span>
            </div>
            <Toggle checked={emailEnabled} onChange={setEmailEnabled} />
          </div>

          <div className={`${styles.inputRow} ${!emailEnabled ? styles.inputRowDisabled : ''}`}>
            <span className={styles.inputIcon}><MailInputIcon /></span>
            <input
              className={styles.input}
              placeholder="请输入邮箱"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!emailEnabled}
              inputMode="email"
            />
          </div>

          <div className={styles.divider} />

          <div className={styles.row}>
            <div className={styles.rowLeft}>
              <span className={styles.icon}><PushAlarmIcon /></span>
              <span className={styles.rowLabel}>推送</span>
            </div>
            <Toggle checked={pushEnabled} onChange={setPushEnabled} />
          </div>
        </div>
      </div>
    </BottomSheetModal>
  );
}
