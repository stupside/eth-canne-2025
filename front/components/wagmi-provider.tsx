"use client"

import { State, WagmiProvider } from 'wagmi'

import { config } from '../lib/wagmi'
import { FC, PropsWithChildren } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

export const Wagmi: FC<PropsWithChildren<{
  state?: State
}>> = ({ children, state }) => {
  return (
    <WagmiProvider config={config} initialState={state}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}