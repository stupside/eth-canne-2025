import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Header } from "@/components/header"
import { Wagmi } from "@/components/wagmi-provider"
import getConfig from "next/config"
import { headers } from "next/headers"
import { cookieToInitialState } from "wagmi"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Simple dApp",
  description: "A simple dApp with MetaMask integration",
  generator: 'v0.dev'
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {

  const initialState = cookieToInitialState(
    getConfig(),
    (await headers()).get('cookie')
  )

  return (
    <html lang="en">
      <body className={inter.className}>
        <Wagmi state={initialState}>
          <Header />
          <main className="container mx-auto px-4 py-8">
            {children}
          </main>
        </Wagmi>
      </body>
    </html>
  )
}
