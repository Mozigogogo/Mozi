import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import Web3Provider from "../context/Web3Provider.jsx";
import WalletAccountSync from "@/components/WalletAccountSync";
import I18nProvider from "@/components/I18nProvider";
import { LogoLoading } from "@/components/Loading";

const geistSans = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Roboto_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Moziinnovations - Digital Currency Community",
  description: "Moziinnovations digital currency community, providing cryptocurrency market data and community discussions",
  icons: {
    icon: "/icons/logo.jpg",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="icon" href="/icons/logo.jpg" type="image/jpeg" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1677ff" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <I18nProvider>
          <Web3Provider>
            <WalletAccountSync />
            <Suspense fallback={<LogoLoading visible={true} fullscreen mask image="/images/community/loadding.png" size={72} />}>
              {children}
            </Suspense>
          </Web3Provider>
        </I18nProvider>
      </body>
    </html>
  );
}
