"use client";

import { useEffect, useState } from "react";
import { Toast } from "antd-mobile";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import Layout from "@/components/Layout";
import NavBar from "@/components/NavBar";
import { request } from "@/utils/request";
import { Interface } from "@/utils/constants";
import { safeBack } from "@/utils/navigation";
import styles from "./page.module.less";

const THEMES = [
  { id: "default", nameKey: "theme.themes.default.name", descKey: "theme.themes.default.description", primaryColor: "#11B787", bgColor: "#EEF0F3", themeColor: 1 },
  { id: "orange", nameKey: "theme.themes.orange.name", descKey: "theme.themes.orange.description", primaryColor: "#FF7E09", bgColor: "#FFF7E6", themeColor: 2 },
  { id: "pink", nameKey: "theme.themes.pink.name", descKey: "theme.themes.pink.description", primaryColor: "#FF4596", bgColor: "#FFF0F6", themeColor: 3 },
  { id: "purple", nameKey: "theme.themes.purple.name", descKey: "theme.themes.purple.description", primaryColor: "#B134FF", bgColor: "#F9F0FF", themeColor: 5 },
  { id: "red", nameKey: "theme.themes.red.name", descKey: "theme.themes.red.description", primaryColor: "#F43138", bgColor: "#FFF1F0", themeColor: 6 },
  { id: "black", nameKey: "theme.themes.black.name", descKey: "theme.themes.black.description", primaryColor: "#161A1E", bgColor: "#141414", themeColor: 7 },
  { id: "blue", nameKey: "theme.themes.blue.name", descKey: "theme.themes.blue.description", primaryColor: "#13399E", bgColor: "#E6F7FF", themeColor: 4 },
  { id: "yellow", nameKey: "theme.themes.yellow.name", descKey: "theme.themes.yellow.description", primaryColor: "#E5C100", bgColor: "#FFFFF0", themeColor: 8 },
];

export default function ThemeCenterPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [currentTheme, setCurrentTheme] = useState("default");
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const updateIsDesktop = () => setIsDesktop(mediaQuery.matches);
    updateIsDesktop();
    mediaQuery.addEventListener("change", updateIsDesktop);
    return () => mediaQuery.removeEventListener("change", updateIsDesktop);
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("app_theme");
      if (saved) setCurrentTheme(saved);
    } catch {}
  }, []);

  const handleSelectTheme = async (themeId) => {
    const theme = THEMES.find((item) => item.id === themeId);
    if (!theme) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        Toast.show({ content: t("auth.notLoggedIn") || t("user.pleaseLogin"), position: "bottom" });
        return;
      }

      const userInfo = JSON.parse(localStorage.getItem("userInfo") || "null");

      Toast.show({ icon: "loading", content: t("theme.switching"), duration: 0 });

      const storedUserId = (userInfo && userInfo.userId) || localStorage.getItem("userId");

      const res = await request({
        url: Interface.EDIT_USER_THEME,
        method: "POST",
        data: { userId: storedUserId, themeColor: theme.themeColor },
      });

      Toast.clear();

      if (res && (res.code === 0 || res.success)) {
        setCurrentTheme(themeId);
        try {
          localStorage.setItem("app_theme", themeId);
        } catch {}
        Toast.show({ content: t("theme.switchSuccess"), icon: "success", position: "bottom" });
        setTimeout(() => {
          if (isDesktop) {
            safeBack(router, { fallback: "/home" });
          } else {
            window.location.href = "/user";
          }
        }, 1200);
      } else {
        Toast.show({ content: res?.errorMsg || t("theme.switchFailed"), icon: "fail", position: "bottom" });
      }
    } catch {
      Toast.clear();
      Toast.show({ content: t("theme.switchFailedRetry"), icon: "fail", position: "bottom" });
    }
  };

  const pageContent = (
    <div className={`${styles.page} ${isDesktop ? styles.pageDesktop : ""}`}>
      {!isDesktop ? <NavBar title={t("user.skinCenter")} showBorder={false} /> : null}

      <div className={styles.content}>
        <section className={styles.panel}>
          <div className={styles.sectionHeader}>
            {isDesktop ? (
              <div
                className={styles.backButton}
                onClick={() => safeBack(router, { fallback: "/home" })}
                role="button"
                tabIndex={0}
                aria-label="Back"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    safeBack(router, { fallback: "/home" });
                  }
                }}
              >
                <span aria-hidden>←</span>
              </div>
            ) : null}
            <div className={styles.sectionTitle}>{t("user.skinCenter")}</div>
          </div>

          <div className={styles.header}>{t("theme.selectTheme")}</div>

          <div className={styles.themeGrid}>
            {THEMES.map((theme) => (
              <div
                key={theme.id}
                className={`${styles.themeCard} ${currentTheme === theme.id ? styles.active : ""}`}
                onClick={() => handleSelectTheme(theme.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSelectTheme(theme.id);
                  }
                }}
              >
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
                    {currentTheme === theme.id ? (
                      <div className={styles.badge}>{t("theme.current")}</div>
                    ) : null}
                  </div>
                  <div className={styles.desc}>{t(theme.descKey)}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );

  if (isDesktop) {
    return <div className={styles.pcContentArea}>{pageContent}</div>;
  }

  return <Layout>{pageContent}</Layout>;
}