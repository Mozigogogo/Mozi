import { Inter, Roboto_Mono, Chakra_Petch } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import Web3Provider from "../context/Web3Provider.jsx";
import ThemeProvider from "../context/ThemeProvider.jsx";
import TonConnectProvider from "../context/TonConnectProvider.jsx";
import I18nProvider from "@/components/I18nProvider";
import VConsoleLoader from "@/components/VConsole";
import InviteCodeHandler from "@/components/InviteCodeHandler";
import DetailDeepLinkHandler from "@/components/DetailDeepLinkHandler";
import TelegramRootGate from "@/components/TelegramRootGate";
import EnvironmentDetector from "@/components/EnvironmentDetector";
import RouteChangeHandler from "@/components/RouteChangeHandler";
import ClientNavigationBridge from "@/components/ClientNavigationBridge";
import DetailNavigationShell from "@/components/DetailNavigationShell";
import RouteBootLoading from "@/components/RouteBootLoading";
import TokenDebugMonitor from "@/components/TokenDebugMonitor";
import BuildFingerprint from "@/components/BuildFingerprint";
import ChunkErrorRecovery from "@/components/ChunkErrorRecovery";
import GoogleAuthProvider from "../context/GoogleAuthProvider";
import GlobalClientEffects from "@/components/GlobalClientEffects";
import PcLayoutGate from "@/components/PcLayoutGate";
import { PcLayoutShellFallback } from "@/components/PcLayoutGate/PcLayoutShellFallback";
import AntdRegistry from "@/components/AntdRegistry";
import ThemeInitScript from "@/components/ThemeInitScript";
import LanguageInitScript from "@/components/LanguageInitScript";
import SessionInitScript from "@/components/SessionInitScript";
import PerfDebug from "@/components/PerfDebug";
import TgRootRedirectScript from "@/components/TgRootRedirectScript";
import TelegramSdkLoader from "@/components/TelegramSdkLoader";
import TgWcWebviewCheck from "@/components/TgWcWebviewCheck";
import { cookies, headers } from "next/headers";
import {
  I18N_COOKIE_KEY,
  I18N_SSR_DEFAULT_LNG,
  htmlLangFor,
  normalizeLng,
} from "@/i18n/languageStorage";
import { isProbablyPcUa } from "@/utils/deviceUa";
import {
  BRAND_LEGAL_NAME,
  DEFAULT_DESCRIPTION,
  DEFAULT_KEYWORDS,
  DEFAULT_OG_IMAGE,
  DEFAULT_TITLE,
  SITE_NAME_ZH,
  SITE_URL,
  buildPageMetadata,
} from "@/utils/seoConfig";

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
  metadataBase: new URL(SITE_URL),
  ...buildPageMetadata({
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    path: '/',
    keywords: DEFAULT_KEYWORDS,
    image: DEFAULT_OG_IMAGE,
  }),
  title: {
    default: DEFAULT_TITLE,
    template: `%s | ${SITE_NAME_ZH}`,
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.png', type: 'image/png', sizes: '512x512' },
    ],
    shortcut: '/favicon.ico',
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  manifest: '/manifest.json',
  category: 'finance',
  authors: [{ name: BRAND_LEGAL_NAME, url: SITE_URL }],
  creator: BRAND_LEGAL_NAME,
  publisher: BRAND_LEGAL_NAME,
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#11B787',
};

export default function RootLayout({ children }) {
  const cookieStore = cookies();
  const headerLng = normalizeLng(headers().get('x-mozi-seo-lng'));
  const initialLng =
    headerLng ||
    normalizeLng(cookieStore.get(I18N_COOKIE_KEY)?.value) ||
    I18N_SSR_DEFAULT_LNG;
  const ssrIsPC = isProbablyPcUa(headers().get("user-agent") || "");

  return (
    <html lang={htmlLangFor(initialLng)} suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.png" type="image/png" sizes="512x512" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        {/* Keep only truly global/critical preload asset to avoid stealing bandwidth from home first paint */}
        <link rel="preload" href="https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/community/loadding.png" as="image" />
        <TgRootRedirectScript />
        <ThemeInitScript />
        <LanguageInitScript />
        <SessionInitScript />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} ${chakraPetch.variable}`} suppressHydrationWarning>
        <TelegramSdkLoader />
        <EnvironmentDetector />
        <PerfDebug />
        <TgWcWebviewCheck />
        <BuildFingerprint />
        <ChunkErrorRecovery />
        <RouteChangeHandler />
        <ClientNavigationBridge />
        <DetailNavigationShell />
        <RouteBootLoading />
        {process.env.NODE_ENV !== 'production' ? <TokenDebugMonitor /> : null}
        <VConsoleLoader />
        <Suspense fallback={null}>
          <TelegramRootGate />
          <InviteCodeHandler />
          <DetailDeepLinkHandler />
        </Suspense>
        <ThemeProvider>
          <I18nProvider initialLng={initialLng}>
            <GoogleAuthProvider>
              <TonConnectProvider>
                <Web3Provider>
                  <GlobalClientEffects />
                  {/*
                    不能用 fallback={null}：PcLayoutGate 等 client 边界在 SSR 挂起时
                    会把整页 children 替换成空壳，Google 抓不到正文。
                    fallback 回退为 children，保证首屏 HTML 始终有内容。
                  */}
                  <AntdRegistry>
                    {/*
                      外层 Suspense：PcLayoutGate / useSearchParams 挂起时仍渲染 children。
                      占位壳必须包住 children，禁止空壳闪白。
                    */}
                    <Suspense
                      fallback={
                        <PcLayoutShellFallback ssrIsPC={ssrIsPC}>{children}</PcLayoutShellFallback>
                      }
                    >
                      <PcLayoutGate ssrIsPC={ssrIsPC}>{children}</PcLayoutGate>
                    </Suspense>
                  </AntdRegistry>
                </Web3Provider>
              </TonConnectProvider>
            </GoogleAuthProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
