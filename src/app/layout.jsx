import { Inter, Roboto_Mono } from "next/font/google";
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

const geistSans = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Roboto_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1677ff" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <EnvironmentDetector />
        <VConsoleLoader />
        <Suspense fallback={null}>
          <InviteCodeHandler />
        </Suspense>
        <ThemeProvider>
          <I18nProvider>
            <TonConnectProvider>
              <Web3Provider>
                <WalletAccountSync />
                <Suspense fallback={<LogoLoading visible={true} fullscreen mask image="/images/community/loadding.png" size={72} />}>
                  {children}
                </Suspense>
              </Web3Provider>
            </TonConnectProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
