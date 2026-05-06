import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { AuthProvider } from "@/components/providers/session-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vie",
  description: "Vie is a platform for creating and managing your organization's processes and teams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=document.documentElement;var c=document.cookie;var m=/(?:^|; )vie-theme=([^;]+)/.exec(c)||/(?:^|; )vapps-theme=([^;]+)/.exec(c);var raw=m?decodeURIComponent(m[1]):null;var ls=null;try{ls=localStorage.getItem("vie-theme");}catch(e){}var pref=raw||(ls==="light"||ls==="dark"||ls==="system"?ls:null);var resolved;if(pref==="light"||pref==="dark")resolved=pref;else resolved=typeof window!==\"undefined\"&&window.matchMedia&&window.matchMedia(\"(prefers-color-scheme: dark)\").matches?\"dark\":\"light\";try{if(raw===\"light\"||raw===\"dark\")localStorage.setItem(\"vie-theme\",raw);}catch(e){}d.classList.remove(\"light\",\"dark\");d.classList.add(resolved);}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <AuthProvider>
            <QueryProvider>{children}</QueryProvider>
          </AuthProvider>
        </ThemeProvider>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
