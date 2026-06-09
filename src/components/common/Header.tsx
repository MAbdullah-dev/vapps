"use client"

import React from 'react'
import ThemeToggle from './ThemeToggle'
import LanguageSwitcher from './LanguageSwitcher'
import BrandLogo from './BrandLogo'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { getClientHost, getLogoutCallbackUrl } from '@/lib/domain-auth'
import { useTranslate } from '@/components/providers/translation-provider'

const Header = () => {
  const { t } = useTranslate()

  const handleLogout = async () => {
    await signOut({ callbackUrl: getLogoutCallbackUrl(getClientHost()) })
  }

  return (
    <>
      <header>
        <div className="container mx-auto px-5">
          <div className="flex justify-end items-center gap-2 pt-3">
            <LanguageSwitcher />
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              title={t("Logout")}
              aria-label={t("Logout")}
              onClick={handleLogout}
              className="text-muted-foreground hover:text-red-500"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
          <div className="inner flex items-center flex-col py-4">
            <BrandLogo alt="app-logo" width={150} height={64} />
            <h3 className="text-lg text-primary">{t("Welcome to Vie")}</h3>
       
            <p className="text-muted-foreground">{t("Get started by creating organizations or joining a workspace or process")}</p>
       
          </div>
        </div>
      </header>
    </>
  )
}

export default Header
