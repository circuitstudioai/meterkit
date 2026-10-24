import { BRAND } from "@meterkit/config";

export const metadata = {
  title: `${BRAND.name} metered chat`,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "ui-sans-serif, system-ui", margin: 0 }}>
        {children}
      </body>
    </html>
  );
}
