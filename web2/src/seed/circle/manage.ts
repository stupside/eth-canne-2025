import { Config } from '../../cfg'
import { initiateDeveloperControlledWalletsClient, generateEntitySecretCiphertext } from '@circle-fin/developer-controlled-wallets'
import { CircleState, CircleStateType } from './state'
import fs from 'fs'
import axios from 'axios'
import { randomUUID } from 'node:crypto'

const STORE_FILE_PATH = './circle.json'

function readCircleState(): CircleState {
    if (!fs.existsSync(STORE_FILE_PATH)) return new CircleState()
    try {
        return CircleState.fromJSON(fs.readFileSync(STORE_FILE_PATH, 'utf8'))
    } catch {
        return new CircleState()
    }
}

function writeCircleState(state: CircleState) {
    fs.writeFileSync(STORE_FILE_PATH, state.toJSON(), 'utf8')
}

async function ensureWireId(state: CircleState, config: Config): Promise<CircleState> {
    if (state.value.wireId) return state
    const idempotencyKey = randomUUID()
    const wire = await axios.post<{ data: { id: string } }>(
        `${config.CIRCLE_MINT_API_URL}/v1/businessAccount/banks/wires`,
        {
            idempotencyKey,
            accountNumber: "12340010",
            routingNumber: "121000248",
            billingDetails: { name: "Satoshi Nakamoto", city: "Boston", country: "US", line1: "100 Money Street", line2: "Suite 1", district: "MA", postalCode: "01234" },
            bankAddress: { bankName: "SAN FRANCISCO", city: "SAN FRANCISCO", country: "US", line1: "100 Money Street", line2: "Suite 1", district: "CA" }
        },
        { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.CIRCLE_MINT_API_SECRET}` } }
    )

    console.log('Created Circle wire:', wire.data.data.id)

    return state.merge({ wireId: wire.data.data.id })
}

async function ensureWallet(state: CircleState, config: Config): Promise<CircleState> {
    if (state.value.walletAddress && state.value.cipherText) return state
    const client = initiateDeveloperControlledWalletsClient({
        apiKey: config.CIRCLE_CONSOLE_API_SECRET,
        entitySecret: config.CIRCLE_CONSOLE_DEV_WALLET_SECRET,
    })
    const cipherText = await generateEntitySecretCiphertext({
        apiKey: config.CIRCLE_CONSOLE_API_SECRET,
        entitySecret: config.CIRCLE_CONSOLE_DEV_WALLET_SECRET,
    })
    const walletSet = await client.createWalletSet({ name: 'Credura Wallet' })
    if (!walletSet.data?.walletSet?.id) throw new Error('Failed to create wallet set')
    const wallet = await client.createWallets({
        count: 1,
        accountType: 'EOA',
        blockchains: ['ETH-SEPOLIA'],
        walletSetId: walletSet.data.walletSet.id,
    })
    if (!wallet.data?.wallets?.length) throw new Error('Failed to create wallet')

    console.log('Created Circle wallet:', wallet.data.wallets[0].address)

    return state.merge({ cipherText, walletAddress: wallet.data.wallets[0].address, walletId: wallet.data.wallets[0].id })
}

async function ensureRecipientId(state: CircleState, config: Config): Promise<CircleState> {
    if (state.value.recipientId) return state
    if (!state.value.walletAddress) throw new Error('Wallet address required to create recipient')
    const recipient = await axios.post<{ data: { id: string } }>(
        `${config.CIRCLE_MINT_API_URL}/v1/businessAccount/wallets/addresses/recipient`,
        {
            idempotencyKey: randomUUID(),
            chain: "ETH",
            address: state.value.walletAddress,
            description: "Credura Developer Wallet",
            currency: "USD",
        },
        { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.CIRCLE_MINT_API_SECRET}` } }
    )

    console.log('Created Circle recipient:', recipient.data.data.id)

    return state.merge({ recipientId: recipient.data.data.id })
}

export async function seedCircle(config: Config): Promise<Partial<CircleStateType>> {
    let state = readCircleState()
    const orig = state.value

    state = await ensureWireId(state, config)
    state = await ensureWallet(state, config)
    state = await ensureRecipientId(state, config)

    // Only write if changed
    if (JSON.stringify(state.value) !== JSON.stringify(orig)) writeCircleState(state)
    return state.value
}

export { readCircleState, writeCircleState } 