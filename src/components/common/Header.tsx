import React from 'react'
import Image from 'next/image'
import ThemeToggle from './ThemeToggle'

const Header = () => {
  return (
    <>
      <header>
        <div className="container mx-auto px-5">
          <div className="flex justify-end pt-3">
            <ThemeToggle />
          </div>
          <div className="inner flex items-center flex-col py-4">
            <Image src="/Images/logo.png" alt="app-logo" width={150} height={64} />
            <h3 className="text-lg text-primary">Welcome to Vie</h3>
       
            <p className="text-muted-foreground">Get started by creating organizations or joining a workspace or process</p>
       
          </div>
        </div>
      </header>
    </>
  )
}

export default Header