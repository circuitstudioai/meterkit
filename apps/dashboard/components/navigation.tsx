"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BRAND } from "@meterkit/config";
import {
  LayoutDashboard,
  AppWindow,
  Tags,
  Users,
  CreditCard,
  BarChart3,
  Banknote,
  FileSearch,
} from "lucide-react";

const items = [
  { href: "/wallet", label: "Alpha wallet (read-only)", icon: Users },
  { href: "/", label: "Legacy overview", icon: LayoutDashboard },
  { href: "/apps", label: "Apps", icon: AppWindow },
  { href: "/features", label: "Features & prices", icon: Tags },
  { href: "/balances", label: "Balances", icon: Users },
  { href: "/top-ups", label: "Top-ups", icon: CreditCard },
  { href: "/usage", label: "Usage", icon: BarChart3 },
  { href: "/revenue", label: "Revenue", icon: Banknote },
  { href: "/payouts", label: "Payouts", icon: Banknote },
  { href: "/audit", label: "Audit", icon: FileSearch },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="meter-navigation" aria-label="Main navigation">
      <div className="meter-nav-inner">
        <Link href="/" className="meter-brand">
          <span className="meter-brand-mark" aria-hidden="true">
            M
          </span>
          <span>{BRAND.name}</span>
          <span className="meter-brand-detail">Builder console</span>
        </Link>
        <div className="meter-nav-links">
          {items.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`meter-nav-link ${active ? "is-active" : ""}`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
