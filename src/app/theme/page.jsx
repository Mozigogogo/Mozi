"use client";

import { useEffect, useState } from "react";
import { Toast } from "antd-mobile";
import Layout from "@/components/Layout";
import NavBar from "@/components/NavBar";
import { request } from "@/utils/request";
import { Interface } from "@/utils/constants";
import styles from "./page.module.less";

const THEMES = [
  { id: "default", name: "默认主题", description: "清新绿色，经典配色", primaryColor: "#11B787", bgColor: "#EEF0F3", themeColor: 1 },
  { id: "silver",  name: "钛合银",   description: "科技质感，银灰配色", primaryColor: "#8C8C8C",  bgColor: "#F5F5F5", themeColor: 3 },
  { id: "blue",    name: "海洋蓝",   description: "沉稳大气，专业配色", primaryColor: "#1890FF",  bgColor: "#E6F7FF", themeColor: 4 },
  { id: "purple",  name: "梦幻紫",   description: "优雅神秘，时尚配色", primaryColor: "#722ED1",  bgColor: "#F9F0FF", themeColor: 5 },
  { id: "orange",  name: "活力橙",   description: "热情洋溢，活力配色", primaryColor: "#FA8C16",  bgColor: "#FFF7E6", themeColor: 2 },
  { id: "red",     name: "中国红",   description: "喜庆热烈，传统配色", primaryColor: "#F5222D",  bgColor: "#FFF1F0", themeColor: 6 },
  { id: "dark",    name: "暗黑模式", description: "护眼舒适，夜间专属", primaryColor: "#177DDC",  bgColor: "#141414", themeColor: 7 },
];

export default function ThemeCenterPage() {
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
        Toast.show({ content: "请先登录", position: "bottom" });
        return;
      }

      Toast.show({ icon: "loading", content: "切换中...", duration: 0 });

      const res = await request({
        url: Interface.EDIT_USER_THEME,
        method: "POST",
        data: { userId: userInfo.userId, themeColor: theme.themeColor },
      });

      Toast.clear();

      if (res && (res.code === 0 || res.success)) {
        setCurrentTheme(themeId);
        try { localStorage.setItem("app_theme", themeId); } catch {}
        Toast.show({ content: "主题已切换", icon: "success", position: "bottom" });
        setTimeout(() => { window.location.href = "/user"; }, 1200);
      } else {
        Toast.show({ content: res?.errorMsg || "切换失败", icon: "fail", position: "bottom" });
      }
    } catch (e) {
      Toast.clear();
      Toast.show({ content: "切换失败，请重试", icon: "fail", position: "bottom" });
    }
  };

  return (
    <Layout>
      <div className={styles.container}>
        <NavBar title="皮肤中心" showBorder={false} />
        <div className={styles.header}>选择你喜欢的主题</div>
        <div className={styles.grid}>
          {THEMES.map((t) => (
            <div key={t.id} className={`${styles.card} ${currentTheme === t.id ? styles.active : ''}`} onClick={() => handleSelectTheme(t.id)}>
              <div className={styles.preview} style={{ backgroundColor: t.bgColor }}>
                <div className={styles.top} style={{ backgroundColor: t.primaryColor }}>
                  <div className={styles.dot} />
                  <div className={styles.bar} />
                </div>
                <div className={styles.block} />
                <div className={styles.block} />
              </div>
              <div className={styles.info}>
                <div className={styles.row}>
                  <div className={styles.name}>{t.name}</div>
                  {currentTheme === t.id && <div className={styles.badge}>当前</div>}
                </div>
                <div className={styles.desc}>{t.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}