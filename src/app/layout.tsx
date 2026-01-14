import type { Metadata } from "next";
import { Inter, Fira_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const firaMono = Fira_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VoxTube · Agente de Voz para YouTube",
  description:
    "Controle pesquisas, playlists e destaques do YouTube usando comandos de voz com resposta falada em tempo real.",
  openGraph: {
    title: "VoxTube · Agente de Voz para YouTube",
    description:
      "Faça buscas e receba recomendações do YouTube com comandos de voz e respostas naturais.",
    url: "https://agentic-b1b052e9.vercel.app",
    siteName: "VoxTube",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "VoxTube · Agente de Voz para YouTube",
    description:
      "Assistente de voz inteligente para explorar o YouTube com comandos naturais.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} ${firaMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
