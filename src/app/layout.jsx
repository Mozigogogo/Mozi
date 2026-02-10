import { Inter, Roboto_Mono, Chakra_Petch } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Suspense } from "react";
import Web3Provider from "../context/Web3Provider.jsx";
import ThemeProvider from "../context/ThemeProvider.jsx";
import TonConnectProvider from "../context/TonConnectProvider.jsx";
import WalletAccountSync from "@/components/WalletAccountSync";
import I18nProvider from "@/components/I18nProvider";
import { LogoLoading } from "@/components/Loading";
import VConsoleLoader from "@/components/VConsole";
import InviteCodeHandler from "@/components/InviteCodeHandler";
import EnvironmentDetector from "@/components/EnvironmentDetector";
import RouteChangeHandler from "@/components/RouteChangeHandler";
import TelegramAutoLogin from "@/components/TelegramAutoLogin";
import GoogleAuthProvider from "../context/GoogleAuthProvider";

const geistSans = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Roboto_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const chakraPetch = Chakra_Petch({
  variable: "--font-chakra-petch",
  subsets: ["latin"],
  weight: ["700"],
});

export const metadata = {
  title: "墨子 - 数字货币行情社区",
  description: "墨子数字货币行情社区，提供币种行情、社区讨论等功能",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1677ff" />
        {/* Preload critical images */}
        <link rel="preload" href="/images/new_login/modal_bg.png" as="image" />
        <link rel="preload" href="/images/new_login/logo.svg" as="image" />
        <link rel="preload" href="/images/new_login/google.svg" as="image" />
        <link rel="preload" href="/images/new_login/wallet.svg" as="image" />
        <link rel="preload" href="/images/new_login/email_default.svg" as="image" />
        <link rel="preload" href="/images/new_login/email_active.svg" as="image" />
        <link rel="preload" href="/images/new_login/password.svg" as="image" />
        <link rel="preload" href="/images/new_login/password_active.svg" as="image" />
        <link rel="preload" href="/images/new_login/open_eyes.png" as="image" />
        <link rel="preload" href="/images/new_login/close_eyes.svg" as="image" />
        <link rel="preload" href="/images/new_login/close.svg" as="image" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} ${chakraPetch.variable}`} suppressHydrationWarning>
        {/* Telegram WebApp 官方脚本 - 必须最先加载 */}
        <Script 
          src="https://telegram.org/js/telegram-web-app.js" 
          strategy="beforeInteractive"
        />
        <EnvironmentDetector />
        <RouteChangeHandler />
        <VConsoleLoader />
        <Suspense fallback={null}>
          <InviteCodeHandler />
        </Suspense>
        <TelegramAutoLogin />
        <ThemeProvider>
          <I18nProvider>
            <GoogleAuthProvider>
              <TonConnectProvider>
                <Web3Provider>
                  <WalletAccountSync />
                  <Suspense fallback={<LogoLoading visible={true} fullscreen mask image="/images/community/loadding.png" size={72} />}>
                    {children}
                  </Suspense>
                </Web3Provider>
              </TonConnectProvider>
            </GoogleAuthProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
