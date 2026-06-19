const fs = require('fs');

const content = `import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/hooks/useAuth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Karbo Skills",
  description: "Plataforma de claridad de rol y aprendizaje por cargo — by elemental.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="es"
      className={\`\${geistSans.variable} \${geistMono.variable} h-full antialiased\`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
`;

fs.writeFileSync('app/layout.js', content, 'utf8');
console.log('app/layout.js actualizado, longitud:', content.length);