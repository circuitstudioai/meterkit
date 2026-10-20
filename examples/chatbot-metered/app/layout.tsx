import { WalletProvider } from "@meterkit/react";
import { BRAND } from "@meterkit/config";

export const metadata = {
  title: `${BRAND.name} metered chat`,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "ui-sans-serif, system-ui", margin: 0 }}>
        <WalletProvider userId="user_alex" apiUrl={process.env.NEXT_PUBLIC_METERKIT_API_URL || "http://localhost:43123"}>
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}
