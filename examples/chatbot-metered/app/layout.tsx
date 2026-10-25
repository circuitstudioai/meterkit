import "./globals.css";
import { BRAND } from "@meterkit/config";

export const metadata = {
  title: `${BRAND.name} metered chat`,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
