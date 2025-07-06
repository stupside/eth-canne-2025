import axios from 'axios';
import { randomUUID } from 'node:crypto';
import { Config } from '../../cfg';

export class CircleMintService {
    private static async _getBankWireInstructions(wireId: string, config: Config) {
        const instructions = await axios.get<{
            data: {
                trackingRef: string;
                beneficiaryBank: {
                    accountNumber: string;
                }
            }
        }>(
            `${config.CIRCLE_MINT_API_URL}/v1/businessAccount/banks/wires/${wireId}/instructions`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.CIRCLE_MINT_API_SECRET}`
                }
            }
        );

        return {
            trackingRef: instructions.data.data.trackingRef,
            accountNumber: instructions.data.data.beneficiaryBank.accountNumber
        };
    }

    /**
     * Create a bank wire transfer using a wire id that should be generated and saved during the seed phase.
     * The wire id should NOT come from a route parameter.
     */
    static async createBankWireTransfer(wireId: string, data: { amount: number, currency: string }, config: Config) {

        const instructions = await CircleMintService._getBankWireInstructions(wireId, config);

        const response = await axios.post<{
            data: {
                trackingRef: string;
            }
        }>(
            `${config.CIRCLE_MINT_API_URL}/v1/mocks/payments/wire`,
            {
                amount: {
                    amount: data.amount,
                    currency: data.currency
                },
                trackingRef: instructions.trackingRef,
                beneficiaryBank: { accountNumber: instructions.accountNumber },
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.CIRCLE_MINT_API_SECRET}`
                }
            }
        )

        return {
            id: response.data.data.trackingRef,
        }
    }

    static async transferToRecipient(recipientId: string, data: { amount: number, currency: string }, config: Config) {
        await axios.post<{
            data: {}
        }>(
            `${config.CIRCLE_MINT_API_URL}/v1/businessAccount/transfers`,
            {
                idempotencyKey: randomUUID(),
                amount: {
                    amount: data.amount,
                    currency: data.currency
                },
                destination: {
                    type: "verified_blockchain",
                    addressId: recipientId,
                },
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.CIRCLE_MINT_API_SECRET}`
                }
            }
        ).catch((error) => {
            console.error('Error transferring to recipient:', error.response?.data || error.message);
            throw new Error('Failed to transfer to recipient');
        });

        return {};
    }
} 