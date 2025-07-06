"use client"

import { http, createConfig, createStorage, cookieStorage } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'

export const config = createConfig({
    ssr: true,
    chains: [mainnet, sepolia],
    connectors: [
        // injected()
    ],
    storage: createStorage({
        storage: cookieStorage,
    }),
    transports: {
        [mainnet.id]: http(),
        [sepolia.id]: http(),
    },
})
