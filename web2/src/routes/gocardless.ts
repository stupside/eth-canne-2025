import { FastifyInstance } from 'fastify';
import { GocardlessService } from '../services/gocardless';
import { CircleMintService } from '../services/circle/mint';
import { Static, Type } from '@sinclair/typebox';
import { CircleConsoleService } from '../services/circle/console';

const GoCardlessWebhookBody = Type.Object({
    events: Type.Array(Type.Object({
        id: Type.String(),
        action: Type.String(),
        resource_type: Type.String(),
        links: Type.Record(Type.String(), Type.String()),
    })),
});

const GoCardlessBillingRequestBody = Type.Object({
    user: Type.Object({
        wallet: Type.String(),
    }),
    order: Type.Object({
        amount: Type.Number(),
        currency: Type.String(),
        payments: Type.Number(),
        frequency: Type.Union([Type.Literal('weekly'), Type.Literal('monthly')]),
    })
});

const AuthorisationUrlResponse = Type.Object({
    authorisationUrl: Type.String(),
});

const ErrorResponse = Type.Object({
    error: Type.String(),
});

export let cachedWallet: string | undefined;

export default async function gocardlessRoutes(fastify: FastifyInstance) {

    // GoCardless: Webhook for payment events
    fastify.post('/gocardless/webhook', {
        schema: {
            body: GoCardlessWebhookBody,
            response: {
                200: Type.Object({}),
                500: ErrorResponse,
            },
            tags: ['gocardless'],
            summary: 'Handle GoCardless payment webhooks',
        }
    }, async (request, reply) => {
        try {
            const events = request.body as Static<typeof GoCardlessWebhookBody>;

            let instalmentAmount = 0;

            for (const event of events.events) {
                if (event.resource_type === 'payments') {

                    // We took money from the user's bank account
                    if (event.action === 'paid_out') {

                        const { payment } = event.links;

                        const { amount, currency } = await GocardlessService.getPaymentDetails(payment, fastify.config);

                        const value = amount / 100;

                        if (!fastify.circle.wireId) {
                            throw new Error('Circle wire ID not seeded');
                        }

                        console.log('GoCardless payment received:', {
                            walletId: fastify.circle.walletId,
                            amount: value,
                            currency,
                        });

                        // TODO: In reality, we would transfer the money from gocardless to our circle wire.
                        await CircleMintService.createBankWireTransfer(fastify.circle.wireId, { amount: value, currency }, fastify.config);

                        // Poll the transfer status until it is completed
                        await new Promise<void>((resolve, reject) => {
                            setInterval(async () => {
                                setTimeout(resolve, 4000); // Wait for 4.0 seconds before checking the status again
                            })
                        })

                        if (!fastify.circle.recipientId) throw new Error('Recipient id not seeded');

                        instalmentAmount += value;

                        fastify.log.info('GoCardless payment completed:', {
                            walletId: fastify.circle.walletId,
                            amount: value,
                            currency,
                        });

                        // Make the money avaible to the circle developper wallet
                        await CircleMintService.transferToRecipient(fastify.circle.recipientId, {
                            amount: value,
                            currency,
                        }, fastify.config);

                        fastify.log.info('Circle transfer completed:', {
                            walletId: fastify.circle.walletId,
                            amount: value,
                            currency,
                        });

                        continue;
                    }

                    if (event.action === "created") { // We created a new instalment schedule to charge the user's bank account

                        const { amount } = await GocardlessService.getPaymentDetails(event.links.payment, fastify.config);

                        // Sum the instalment amounts
                        instalmentAmount += amount;

                        fastify.log.info('GoCardless instalment schedule created:', {
                            walletId: fastify.circle.walletId,
                            instalmentAmount: instalmentAmount
                        });

                        continue;
                    }
                }
            }

            if (instalmentAmount) {

                instalmentAmount *= 10e3

                fastify.log.info('Requesting funding for borrower:', {
                    walletId: fastify.circle.walletId,
                    instalmentAmount: instalmentAmount
                });

                await CircleConsoleService.executeContract(fastify.circle.walletId!, {
                    functionAbi: "requestFundingForBorrower(address,uint256,uint256)",
                    parameters: [
                        cachedWallet, // User's wallet address
                        Math.round(instalmentAmount), // Total amount in cents (e.g., $10.00 + 10% fee for 5 payments = $11.00 = 1100 cents)
                        Math.round(instalmentAmount + (instalmentAmount * 0.1)), // Amount minus 10% fee (e.g., $10.00 - 10% = $9.00 = 900 cents)
                    ]
                }, fastify.config)
            }

        } catch (error) {
            console.error('Error processing GoCardless webhook:', JSON.stringify(error, null, 2));
            reply.code(500).send({ error: 'Failed to process GoCardless webhook' });
        }
    });

    // GoCardless: Create a billing request
    fastify.post('/gocardless/checkout', {
        schema: {
            body: GoCardlessBillingRequestBody,
            response: {
                200: AuthorisationUrlResponse,
                500: ErrorResponse,
            },
            tags: ['gocardless'],
            summary: 'Create a GoCardless billing request',
        }
    }, async (request, reply) => {
        try {
            const { user, order } = request.body as {
                user: {
                    wallet: string;
                };
                order: {
                    amount: number;
                    payments: number;
                    frequency: 'weekly' | 'monthly';
                }
            };

            const exceptedAmount = order.amount + (order.amount * 0.1); // Keep as dollars

            // Create a GoCardless billing request
            const { id } = await GocardlessService.createGoCardlessBillingRequest({
                user,
                order: {
                    amount: exceptedAmount, // Total amount in dollars (e.g., $2.00 + 10% fee = $2.20)
                    payments: order.payments,
                    frequency: order.frequency,
                }
            }, fastify.config);

            // Redirect to the GoCardless authorisation URL
            const { authorisation_url } = await GocardlessService.createGoCardlessBillingRequestFlow(id, fastify.config);

            if (!fastify.circle.walletId) {
                throw new Error('Circle wallet ID not seeded');
            }

            // get the wallet ID from the gocardless metadata
            cachedWallet = user.wallet; // TODO: Find a way to pass the wallet ID to circle !!!!

            reply.send({
                authorisationUrl: authorisation_url,
            });
        } catch (error) {
            console.error('Error creating GoCardless billing request:', JSON.stringify(error, null, 2));
            reply.code(500).send({ error: 'Failed to create GoCardless billing request' });
        }
    });
} 