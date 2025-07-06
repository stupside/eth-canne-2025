import { FastifyInstance } from 'fastify';
import { CircleConsoleService, ExecuteContractData } from '../services/circle/console';
import { CircleMintService } from '../services/circle/mint';
import { Static, Type } from '@sinclair/typebox';
import { cachedWallet } from './gocardless';

// Circle: Webhook for wire transfer events
const TransactionInboundComplete = Type.Object({
    notification: Type.Object({
        state: Type.Enum({
            complete: 'COMPLETE',
        }),
        amounts: Type.Array(Type.String()),
    }),
    notificationType: Type.Literal('transactions.inbound'),
});

// Generic webhook structure for unknown types
const GenericWebhook = Type.Object({
    notificationType: Type.String(),
    notification: Type.Object({}, { additionalProperties: true }),
});

const CircleWebhookBody = Type.Union([
    GenericWebhook,
    TransactionInboundComplete,
]);

const SuccessResponse = Type.Object({
    success: Type.Boolean(),
});

const CircleWirePaymentBody = Type.Object({
    amount: Type.Number(),
    currency: Type.String(),
});

const ErrorResponse = Type.Object({
    error: Type.String(),
});

export default async function circleRoutes(fastify: FastifyInstance) {

    // Circle: Webhook for wire transfer events
    fastify.post('/circle/webhook', {
        schema: {
            body: CircleWebhookBody,
            response: {
                200: SuccessResponse,
                500: ErrorResponse,
            },
            tags: ['circle'],
            summary: 'Handle Circle wire transfer and payment webhooks',
        }
    }, async (request, reply) => {
        try {
            // https://developers.circle.com/circle-mint/notifications-data-models
            const body = request.body as Static<typeof CircleWebhookBody>;
            const { notificationType } = body;

            if (notificationType === "transactions.inbound") {
                const typedBody = body as Static<typeof TransactionInboundComplete>;
                const { notification } = typedBody;

                if (notification.state === "COMPLETE") {
                    const cipherText = fastify.circle.cipherText;
                    if (!cipherText) {
                        throw new Error('Cipher text not seeded');
                    }

                    const walletId = fastify.circle.walletId;
                    if (!walletId) {
                        throw new Error('Wallet id not seeded');
                    }

                    const amount = notification.amounts.map((a: string) => parseFloat(a)).reduce((acc: number, curr: number) => acc + curr, 0);

                    fastify.log.info('Circle wire transfer completed:', {
                        walletId,
                        amount,
                        notification,
                        cachedWallet,
                    });

                    // Init the ExecuteContractData object
                    const executeContractData: ExecuteContractData = {
                        parameters: [cachedWallet, amount * 100], // TODO: cachedWalletId: this should be extracted from the Circle wire transfer metadata 
                        functionAbi: "repayAmountForLoan(address,uint256)",
                    };
                    await CircleConsoleService.executeContract(walletId, executeContractData, fastify.config);
                }

                return reply.code(200).send({ success: true });
            }

        } catch (error) {
            console.error('Error processing Circle wire webhook:', JSON.stringify(error, null, 2));
            reply.code(500).send({ error: 'Failed to process Circle wire webhook ' + JSON.stringify(error, null, 2) });
        }
    });

    // Create a Circle wire transfer (simulated gocardless payment)
    fastify.post('/circle/wire/payment', {
        schema: {
            body: CircleWirePaymentBody,
            response: {
                200: Type.Object({}),
                500: ErrorResponse,
            },
            tags: ['circle'],
            summary: 'Create a simulated Circle wire payment',
        }
    }, async (request, reply) => {
        const { amount, currency } = request.body as { amount: number; currency: string };
        try {
            const wireId = fastify.circle.wireId;
            if (!wireId) throw new Error('Wire id not seeded');
            const _ = await CircleMintService.createBankWireTransfer(wireId, { amount, currency }, fastify.config);
            return {};
        } catch (error) {
            console.error('Error creating Circle write transfer:', JSON.stringify(error, null, 2));
            reply.code(500).send({ error: 'Failed to create Circle write transfer' });
        }
    });
} 