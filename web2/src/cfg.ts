import { Type, Static } from '@sinclair/typebox'

// Configuration schema for the application
export const schema = Type.Object({

    // Bridge Configuration
    BRIDGE_API_URL: Type.String(),
    BRIDGE_API_CLIENT_ID: Type.String(),
    BRIDGE_API_CLIENT_SECRET: Type.String(),

    // Circle Mint Configuration
    CIRCLE_MINT_API_URL: Type.String(),
    CIRCLE_MINT_API_SECRET: Type.String(),
    // Circle Console Configuration
    CIRCLE_CONSOLE_API_URL: Type.String(),
    CIRCLE_CONSOLE_API_SECRET: Type.String(),
    CIRCLE_CONSOLE_DEV_WALLET_SECRET: Type.String(),

    // GoCardless Configuration
    GOCARDLESS_API_URL: Type.String(),
    GOCARDLESS_API_SECRET: Type.String(),
    GOCARDLESS_API_WEBHOOK_SECRET: Type.String(),

    // SlimCollect Configuration
    SLIMCOLLECT_API_URL: Type.String(),
    SLIMCOLLECT_API_SECRET: Type.String(),

    // Application Configuration
    BASE_URL: Type.String(),

    // Node Environment
    NODE_ENV: Type.String(),

    // Pool
    POOL_WALLET_ADDRESS: Type.String({
        description: 'The address of the pool wallet used for transfers',
        default: '0x',
    }),

    // Frontend
    FRONT_BORROW_EXIT_URL: Type.String({
        description: 'The URL to redirect to after a borrow request is completed',
        default: 'https://front.xonery.dev/borrow/exit',
    }),
    FRONT_BORROW_REDIRECT_URL: Type.String({
        description: 'The URL to redirect to after a borrow request is completed',
        default: 'https://front.xonery.dev/borrow/redirect',
    }),
})

// Convert the schema to a TypeScript type
export type Config = Static<typeof schema>