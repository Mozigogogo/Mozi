'use client';

import React, { useState } from "react";
import styles from "./page.module.less";

export default function WhitelistPage() {
  const [email, setEmail] = useState("");

  // 这里只是做静态还原，如需功能扩展请根据实际需要调整
  return (
    <div className={styles.whitelistBg}>
      <div className={styles.whitelistCard}>
        <div className={styles.logo}>Zaiiffer</div>
        <div className={styles.title}>Welcome</div>
        <div className={styles.tip}>Enter your whitelisted email address to continue to Zaiiffer</div>
        <div className={styles.formRow}>
          <label className={styles.label} htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            className={styles.input}
            placeholder="email@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="off"
          />
        </div>
        <button className={styles.connectBtn} disabled={!email}>{"Connect"}</button>
        <div className={styles.tgRow}>
          <a
            href="https://t.me/+2gX28hyIZN45ZGU1"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.tgLink}
          >
            <span className={styles.tgIcon}>🔵</span> Join the <span className={styles.underline}>Official Zaiiffer Telegram</span> channel
          </a>
        </div>
      </div>
    </div>
  );
}
