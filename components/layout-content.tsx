"use client"

import type React from "react"

import { usePathname } from "next/navigation"
import { SidebarNavigation, SidebarProvider, SidebarContent } from "@/components/sidebar-navigation"
import { Navigation } from "@/components/navigation"
import { MobileNavigation } from "@/components/mobile-navigation"
import { MobileHeader } from "@/components/mobile-header"
import { Toaster } from "@/components/ui/toaster"

export function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // The public customer portal (/portal) is shared directly with clients and
  // must render WITHOUT any internal app navigation, sidebar or headers.
  if (pathname?.startsWith("/portal")) {
    return (
      <>
        {children}
        <Toaster />
      </>
    )
  }

  return (
    <SidebarProvider>
      <Navigation />
      <MobileHeader />

      <div className="flex min-h-screen pt-14 md:pt-16">
        <SidebarNavigation />

        <SidebarContent>
          <div className="w-full min-h-screen main-gradient overflow-x-auto">{children}</div>
        </SidebarContent>
      </div>
      <MobileNavigation />
      <Toaster />
    </SidebarProvider>
  )
}
