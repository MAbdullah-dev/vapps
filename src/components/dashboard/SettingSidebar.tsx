"use client";

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
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
import { useTranslate } from '@/components/providers/translation-provider';

const SettingSidebar = () => {
  const params = useParams();
  const pathname = usePathname();
  const slug = params?.orgId as string;
  const { t } = useTranslate();

  const menuItems = useMemo(
    () =>
      [
        { title: t('Organization Profile'), subtitle: t('Company details and branding'), icon: Home, path: 'settings/organization-profile' },
        { title: t('Sites & Departments'), subtitle: t('Locations and structure'), icon: MapPin, path: 'settings/sites-departments' },
        { title: t('Roles'), subtitle: t('Leadership role definitions'), icon: UserCog, path: 'settings/roles' },
        { title: t('Teams'), subtitle: t('Organization users'), icon: Users, path: 'settings/teams' },
        { title: t('Financial Setup'), subtitle: t('Currency, tax, and accounts'), icon: Wallet, path: 'settings/financial-setup' },
        { title: t('Products & Inventory'), subtitle: t('Products and stock defaults'), icon: Package, path: 'settings/products-inventory' },
        { title: t('Customers & Vendors'), subtitle: t('Business contacts'), icon: UsersRound, path: 'settings/customers-vendors' },
        { title: t('Operational Parameters'), subtitle: t('Workflow and SLA defaults'), icon: SlidersHorizontal, path: 'settings/operational-parameters' },
        { title: t('Permissions'), subtitle: t('Role-based access control'), icon: Shield, path: 'settings/permissions' },
        { title: t('Authentication & Access'), subtitle: t('Login and security'), icon: Shield, path: 'settings/authentication-access' },
        { title: t('Billing & Subscription'), subtitle: t('Plans and payments'), icon: CreditCard, path: 'settings/billing-subscription' },
        { title: t('Notifications'), subtitle: t('Email and alerts'), icon: Shield, path: 'settings/notifications' },
        { title: t('KPI & Reports'), subtitle: t('Metrics and dashboards'), icon: BarChart, path: 'settings/kpi-reports' },
        { title: t('Audit Checklist'), subtitle: t('Question management'), icon: FileCheck, path: 'settings/audit-checklist' },
      ].map((item) => ({ ...item, href: getDashboardPath(slug, item.path) })),
    [t, slug]
  );

  if (!slug || slug === 'undefined') {
    return (
      <aside className="w-64 p-4 border-r border-border bg-card text-card-foreground">
        <h2 className="text-lg font-semibold mb-6 text-card-foreground">{t('Settings')}</h2>
        <p className="text-sm mb-4" style={{ color: "hsl(var(--muted-foreground))" }}>{t('Loading...')}</p>
      </aside>
    );
  }

  return (
    <aside className="w-64 p-4 border-r border-border bg-card text-card-foreground">
      <h2 className="text-lg font-semibold mb-6 text-card-foreground dark:text-card-foreground">
        {t('Settings')}
      </h2>
      <p className="text-sm mb-4 text-muted-foreground dark:text-muted-foreground">
        {t('Manage your workspace configuration')}
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
