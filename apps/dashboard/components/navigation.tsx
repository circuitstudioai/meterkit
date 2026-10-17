"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Wallet,
  FileText,
  CheckCircle,
  BarChart3,
  FileSearch,
} from "lucide-react";
import { useEffect, useState } from "react";

export function Navigation() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetch("/api/session")
      .then((res) => res.json())
      .then((data) => setUser(data.user));

    fetch("/api/wallet/stats")
      .then((res) => res.json())
      .then((data) => setStats(data));
  }, []);

  const switchRole = async (email: string) => {
    await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    window.location.reload();
  };

  const navItems = [
    { href: "/wallet", label: "Wallet", icon: Wallet },
    { href: "/requests", label: "Requests", icon: FileText },
    {
      href: "/approvals",
      label: "Approvals",
      icon: CheckCircle,
      badge: stats?.pendingApprovals,
    },
    { href: "/spend", label: "Spend Table", icon: BarChart3 },
    { href: "/audit", label: "Audit Log", icon: FileSearch },
  ];

  return (
    <nav className="border-b bg-white">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/wallet" className="flex items-center gap-2">
              <Wallet className="h-6 w-6 text-blue-600" />
              <span className="text-xl font-bold">AI Spend Wallet</span>
            </Link>

            <div className="flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      className="gap-2"
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                      {item.badge !== undefined && item.badge > 0 && (
                        <Badge variant="destructive" className="ml-1">
                          {item.badge}
                        </Badge>
                      )}
                    </Button>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <>
                <div className="text-right">
                  <div className="text-sm font-medium">{user.name}</div>
                  <div className="text-xs text-gray-500">
                    {user.role} • {user.department}
                  </div>
                </div>
                <select
                  value={user.email}
                  onChange={(e) => switchRole(e.target.value)}
                  className="rounded-md border px-3 py-1 text-sm"
                >
                  <option value="admin@northwind.demo">
                    Admin (Alex Chen)
                  </option>
                  <option value="employee@northwind.demo">
                    Employee (Jordan Smith)
                  </option>
                  <option value="approver@northwind.demo">
                    Approver (Sam Williams)
                  </option>
                </select>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
