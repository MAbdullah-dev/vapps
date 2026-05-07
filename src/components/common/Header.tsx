"use client"

import React from 'react'
import ThemeToggle from './ThemeToggle'
import BrandLogo from './BrandLogo'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { signOut } from 'next-auth/react'

const Header = () => {
  const handleLogout = async () => {
    await signOut({ callbackUrl: "/auth" })
  }

  return (
    <>
      <header>
        <div className="container mx-auto px-5">
          <div className="flex justify-end items-center gap-2 pt-3">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              title="Logout"
              aria-label="Logout"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-red-500"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
          <div className="inner flex items-center flex-col py-4">
            <BrandLogo alt="app-logo" width={150} height={64} />
            <h3 className="text-lg text-primary">Welcome to Vie</h3>
       
            <p className="text-muted-foreground">Get started by creating organizations or joining a workspace or process</p>
       
          </div>
        </div>
      </header>
    </>
  )
}

export default Header