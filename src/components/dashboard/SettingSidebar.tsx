"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { canAccessOrgSettings } from "@/lib/settings-access";
import {
  Home,
  MapPin,
  Users,
  Shield,
  CreditCard,
  BarChart,
  UserCog,
  FileCheck,
  Wallet,
  Package,
  UsersRound,
  SlidersHorizontal,
  ChevronRight,
} from 'lucide-react';
import { getDashboardPath } from '@/lib/subdomain';

const SettingSidebar = () => {
  const params = useParams();
  const pathname = usePathname();
  const slug = params?.orgId as string; // orgId param is slug when on subdomain
  const [canAccess, setCanAccess] = useState<boolean | null>(null);

  useEffect(() => {
    if (!slug || slug === "undefined") return;
    let cancelled = false;
    apiClient
      .getMyOrgMembership(slug)
      .then((data) => {
        if (!cancelled) {
          setCanAccess(canAccessOrgSettings(data.leadershipTier, data.isOwner));
        }
      })
      .catch(() => {
        if (!cancelled) setCanAccess(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (canAccess === false) {
    return null;
  }

  const menuItems = [
    { title: 'Organization Profile', subtitle: 'Company details and branding', icon: Home, path: 'settings/organization-profile' },
    { title: 'Sites & Processes', subtitle: 'Locations and structure', icon: MapPin, path: 'settings/sites-departments' },
    { title: 'Roles', subtitle: 'Leadership role definitions', icon: UserCog, path: 'settings/roles' },
    { title: 'Teams', subtitle: 'Organization users', icon: Users, path: 'settings/teams' },
    { title: 'Financial Setup', subtitle: 'Currency, tax, and accounts', icon: Wallet, path: 'settings/financial-setup' },
    { title: 'Products & Inventory', subtitle: 'Products and stock defaults', icon: Package, path: 'settings/products-inventory' },
    { title: 'Customers & Vendors', subtitle: 'Business contacts', icon: UsersRound, path: 'settings/customers-vendors' },
    { title: 'Operational Parameters', subtitle: 'Workflow and SLA defaults', icon: SlidersHorizontal, path: 'settings/operational-parameters' },
    { title: 'Permissions', subtitle: 'Role-based access control', icon: Shield, path: 'settings/permissions' },
    { title: 'Authentication & Access', subtitle: 'Login and security', icon: Shield, path: 'settings/authentication-access' },
    { title: 'Billing & Subscription', subtitle: 'Plans and payments', icon: CreditCard, path: 'settings/billing-subscription' },
    { title: 'Notifications', subtitle: 'Email and alerts', icon: Shield, path: 'settings/notifications' },
    { title: 'KPI & Reports', subtitle: 'Metrics and dashboards', icon: BarChart, path: 'settings/kpi-reports' },
    { title: 'Audit Checklist', subtitle: 'Question management', icon: FileCheck, path: 'settings/audit-checklist' },
  ].map((item) => ({ ...item, href: getDashboardPath(slug, item.path) }));

  // Don't render links if slug/orgId is not available
  if (!slug || slug === 'undefined') {
    return (
      <aside className="w-64 p-4 border-r border-border bg-card text-card-foreground">
        <h2 className="text-lg font-semibold mb-6 text-card-foreground">Settings</h2>
        <p className="text-sm mb-4" style={{ color: "hsl(var(--muted-foreground))" }}>Loading...</p>
   
      </aside>
    );
  }

  return (
    <aside className="w-64 p-4 border-r border-border bg-card text-card-foreground">
      <h2 className="text-lg font-semibold mb-6 text-card-foreground dark:text-card-foreground">
        Settings
      </h2>
      <p className="text-sm mb-4 text-muted-foreground dark:text-muted-foreground">
        Manage your workspace configuration
      </p>
 
      <ul className="space-y-2">
        {menuItems.map((item, index) => {
          const isActive = pathname === item.href || pathname.endsWith(item.path);
          const Icon = item.icon;
          
          return (
            <Link key={index} href={item.href}>
              <li
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors mb-2 ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-muted text-foreground'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-5 w-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                  </div>
                </div>
                {isActive && (
                  <ChevronRight className="h-4 w-4 text-primary" />
                )}
              </li>
            </Link>
          );
        })}
      </ul>
    </aside>
  );
};

export default SettingSidebar;
