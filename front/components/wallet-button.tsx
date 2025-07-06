"use client"

import { http, createConfig } from '@wagmi/core'
import { mainnet, sepolia } from '@wagmi/core/chains'

export const config = createConfig({
  chains: [mainnet, sepolia],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
})

import { Button } from "@/components/ui/button"
import { useAccount, useConnect, useDisconnect } from 'wagmi'

export function WalletButton() {

  const { isConnected, address } = useAccount()


  const { disconnect } = useDisconnect()
  const { connect, connectors } = useConnect()


  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{`${address.slice(0, 6)}...${address.slice(-4)}`}</span>
        <Button onClick={() => disconnect()} variant="outline" size="sm">
          Disconnect
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Connect Wallet</span>
      {connectors.map((connector) => (
        <Button
          key={connector.id}
          onClick={() => connect({ connector })}
          variant="outline"
          size="sm"
        >
          {connector.name}
        </Button>
      ))}
    </div>
  )
}
