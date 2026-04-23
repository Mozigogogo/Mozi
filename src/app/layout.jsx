import { Inter, Roboto_Mono, Chakra_Petch } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import Web3Provider from "../context/Web3Provider.jsx";
import ThemeProvider from "../context/ThemeProvider.jsx";
import TonConnectProvider from "../context/TonConnectProvider.jsx";
import I18nProvider from "@/components/I18nProvider";
import { LogoLoading } from "@/components/Loading";
import VConsoleLoader from "@/components/VConsole";
import InviteCodeHandler from "@/components/InviteCodeHandler";
import EnvironmentDetector from "@/components/EnvironmentDetector";
import RouteChangeHandler from "@/components/RouteChangeHandler";
import TokenDebugMonitor from "@/components/TokenDebugMonitor";
import BuildFingerprint from "@/components/BuildFingerprint";
import ChunkErrorRecovery from "@/components/ChunkErrorRecovery";
import GoogleAuthProvider from "../context/GoogleAuthProvider";
import GlobalClientEffects from "@/components/GlobalClientEffects";
import PerfDebug from "@/components/PerfDebug";
import TelegramSdkLoader from "@/components/TelegramSdkLoader";
import TgWcWebviewCheck from "@/components/TgWcWebviewCheck";

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
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1677ff" />
        {/* Keep only truly global/critical preload asset to avoid stealing bandwidth from home first paint */}
        <link rel="preload" href="/images/community/loadding.png" as="image" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} ${chakraPetch.variable}`} suppressHydrationWarning>
        <TelegramSdkLoader />
        <EnvironmentDetector />
        <PerfDebug />
        <TgWcWebviewCheck />
        <BuildFingerprint />
        <ChunkErrorRecovery />
        <RouteChangeHandler />
        {process.env.NODE_ENV !== 'production' ? <TokenDebugMonitor /> : null}
        <VConsoleLoader />
        <Suspense fallback={null}>
          <InviteCodeHandler />
        </Suspense>
        <ThemeProvider>
          <I18nProvider>
            <GoogleAuthProvider>
              <TonConnectProvider>
                <Web3Provider>
                  <GlobalClientEffects />
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
