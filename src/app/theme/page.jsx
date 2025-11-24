"use client";

import { useEffect, useState } from "react";
import { Toast } from "antd-mobile";
import { useTranslation } from "react-i18next";
import Layout from "@/components/Layout";
import NavBar from "@/components/NavBar";
import { request } from "@/utils/request";
import { Interface } from "@/utils/constants";
import styles from "./page.module.less";

const THEMES = [
  { id: "default", nameKey: "theme.themes.default.name", descKey: "theme.themes.default.description", primaryColor: "#11B787", bgColor: "#EEF0F3", themeColor: 1 },
  { id: "silver",  nameKey: "theme.themes.silver.name",  descKey: "theme.themes.silver.description",  primaryColor: "#8C8C8C",  bgColor: "#F5F5F5", themeColor: 3 },
  { id: "blue",    nameKey: "theme.themes.blue.name",    descKey: "theme.themes.blue.description",    primaryColor: "#1890FF",  bgColor: "#E6F7FF", themeColor: 4 },
  { id: "purple",  nameKey: "theme.themes.purple.name",  descKey: "theme.themes.purple.description",  primaryColor: "#722ED1",  bgColor: "#F9F0FF", themeColor: 5 },
  { id: "orange",  nameKey: "theme.themes.orange.name",  descKey: "theme.themes.orange.description",  primaryColor: "#FA8C16",  bgColor: "#FFF7E6", themeColor: 2 },
  { id: "red",     nameKey: "theme.themes.red.name",     descKey: "theme.themes.red.description",     primaryColor: "#F5222D",  bgColor: "#FFF1F0", themeColor: 6 },
  { id: "dark",    nameKey: "theme.themes.dark.name",    descKey: "theme.themes.dark.description",    primaryColor: "#177DDC",  bgColor: "#141414", themeColor: 7 },
];

export default function ThemeCenterPage() {
  const { t } = useTranslation();
  const [currentTheme, setCurrentTheme] = useState("default");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("app_theme");
      if (saved) setCurrentTheme(saved);
    } catch {}
  }, []);

  const handleSelectTheme = async (themeId) => {
    const theme = THEMES.find((t) => t.id === themeId);
    if (!theme) return;

    try {
      const userInfo = JSON.parse(localStorage.getItem("userInfo") || "null");
      if (!userInfo || !userInfo.userId) {
        Toast.show({ content: t("auth.notLoggedIn") || t("user.pleaseLogin"), position: "bottom" });
        return;
      }

      Toast.show({ icon: "loading", content: t("theme.switching"), duration: 0 });

      const res = await request({
        url: Interface.EDIT_USER_THEME,
        method: "POST",
        data: { userId: userInfo.userId, themeColor: theme.themeColor },
      });

      Toast.clear();

      if (res && (res.code === 0 || res.success)) {
        setCurrentTheme(themeId);
        try { localStorage.setItem("app_theme", themeId); } catch {}
        Toast.show({ content: t("theme.switchSuccess"), icon: "success", position: "bottom" });
        setTimeout(() => { window.location.href = "/user"; }, 1200);
      } else {
        Toast.show({ content: res?.errorMsg || t("theme.switchFailed"), icon: "fail", position: "bottom" });
      }
    } catch (e) {
      Toast.clear();
      Toast.show({ content: t("theme.switchFailedRetry"), icon: "fail", position: "bottom" });
    }
  };

  return (
    <Layout>
      <div className={styles.container}>
        <NavBar title={t("user.skinCenter")} showBorder={false} />
        <div className={styles.header}>{t("theme.selectTheme")}</div>
        <div className={styles.grid}>
          {THEMES.map((theme) => (
            <div key={theme.id} className={`${styles.card} ${currentTheme === theme.id ? styles.active : ''}`} onClick={() => handleSelectTheme(theme.id)}>
              <div className={styles.preview} style={{ backgroundColor: theme.bgColor }}>
                <div className={styles.top} style={{ backgroundColor: theme.primaryColor }}>
                  <div className={styles.dot} />
                  <div className={styles.bar} />
                </div>
                <div className={styles.block} />
                <div className={styles.block} />
              </div>
              <div className={styles.info}>
                <div className={styles.row}>
                  <div className={styles.name}>{t(theme.nameKey)}</div>
                  {currentTheme === theme.id && <div className={styles.badge}>{t("theme.current")}</div>}
                </div>
                <div className={styles.desc}>{t(theme.descKey)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}