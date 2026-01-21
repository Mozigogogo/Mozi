'use client';

import { useMemo, useState, useEffect } from 'react';
import BottomSheetModal from '../BottomSheetModal';
import CountryPickerOverlay from '../CountryPickerOverlay';
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
    <img src="/icons/new_detail/telephone.svg" alt="phone" width="45" height="45" />
  );
}

function MailAlarmIcon() {
  return (
    <img src="/icons/new_detail/email.svg" alt="email" width="24" height="24" />
  );
}

function PushAlarmIcon() {
  return (
    <img src="/icons/new_detail/push.svg" alt="push" width="24" height="24" />
  );
}

function PhoneInputIcon() {
  return (
    <img src="/icons/new_detail/telephone_num.svg" alt="phone" width="14" height="16" />
  );
}

function MailInputIcon() {
  return (
    <img src="/icons/new_detail/email_num.svg" alt="email" width="18" height="14" />
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

  const [countryPickerOpen, setCountryPickerOpen] = useState(false);


  return (
    <>
      <BottomSheetModal
        open={open}
        onClose={onClose}
        header={
          <div className={styles.header}>
          </div>
        }
        sheetClassName={styles.sheet}
        bodyClassName={styles.bodyNoPadding}
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

            <div className={styles.inputRow}>
              <span className={styles.inputIcon}><PhoneInputIcon /></span>
              <div className={styles.countryCodeWrap}>
                <button
                  type="button"
                  className={styles.countryPickerTrigger}
                  onClick={() => {
                    setCountryPickerOpen(true);
                  }}
                >
                  <span className={styles.countryPickerTriggerValue}>{countryCode}</span>
                  <img className={styles.countryPickerTriggerArrow} src="/icons/new_detail/down_arrow.svg" alt="down" />
                </button>
              </div>
              <input
                className={styles.input}
                placeholder="请输入手机号"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
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

            <div className={styles.inputRow}>
              <span className={styles.inputIcon}><MailInputIcon /></span>
              <input
                className={styles.input}
                placeholder="请输入邮箱"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
          </div>
        </div>
      </BottomSheetModal>

      <CountryPickerOverlay
        open={countryPickerOpen}
        onClose={() => setCountryPickerOpen(false)}
        onSelect={(c) => setCountryCode(c.dialCode)}
      />
    </>
  );
}
