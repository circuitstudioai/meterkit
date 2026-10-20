"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BRAND } from "@meterkit/config";
import { Button } from "@/components/ui/button";
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
  { href: "/", label: "Overview", icon: LayoutDashboard },
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
    <nav className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="rounded bg-slate-900 px-2 py-1 text-xs text-white">
            {BRAND.name}
          </span>
          <span className="hidden text-sm text-slate-600 sm:inline">{BRAND.tagline}</span>
        </Link>
        <div className="flex flex-wrap gap-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <Button variant={active ? "default" : "ghost"} size="sm" className="gap-1">
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
