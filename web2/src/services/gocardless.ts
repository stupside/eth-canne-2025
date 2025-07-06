import axios from 'axios';

import { Config } from '../cfg';

export class GocardlessService {

    static async getPaymentDetails(paymentId: string, config: Config) {
        const response = await axios.get<{
            payments: {
                amount: number; currency: string,
            }
        }>(
            `${config.GOCARDLESS_API_URL}/payments/${paymentId}`,
            {
                headers: {
                    'Authorization': `Bearer ${config.GOCARDLESS_API_SECRET}`,
                    'GoCardless-Version': '2015-07-06',
                },
            }
        );

        return response.data.payments;
    }

    static async createGoCardlessBillingRequest(data: {
        user: {
            wallet: string;
        };
        order: {
            amount: number;
            payments: number;
            frequency: 'weekly' | 'monthly';
        }
    }, config: Config) {

        const now = new Date();

        const cents = Math.floor(data.order.amount * 100);

        const rest = cents % data.order.payments;
        const quotien = Math.floor(cents / data.order.payments);

        // Create an array of amounts for each payment
        const amounts = Array(data.order.payments).fill(quotien);

        if (rest > 0) {
            amounts[amounts.length - 1] += rest; // Add the remainder to the last payment
        }

        const response = await axios.post<{ billing_requests: { id: string } }>(
            `${config.GOCARDLESS_API_URL}/billing_requests`,
            {
                purpose_code: "loan",
                billing_requests: {
                    metadata: {
                        wallet: data.user.wallet,
                    },
                    mandate_request: {
                        scheme: "ach",
                        consent_type: "recurring"
                    },
                    // https://developer.gocardless.com/ach-and-pad-consent-types
                    instalment_schedule_request: {
                        name: "Crypto Loan",
                        currency: "USD",
                        total_amount: cents,
                        retry_if_possible: true,
                        instalments_with_schedule: {
                            amounts,
                            interval: data.order.payments,
                            start_date: now.toISOString().split('T')[0],
                            interval_unit: data.order.frequency,
                        },
                    },
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${config.GOCARDLESS_API_SECRET}`,
                    'GoCardless-Version': '2015-07-06',
                    'Content-Type': 'application/json',
                },
            }
        ).catch(error => {
            console.error('Error creating GoCardless billing request:', JSON.stringify(error.response?.data || error, null, 2));
            throw new Error('Failed to create GoCardless billing request');
        });

        return response.data.billing_requests;
    }

    static async createGoCardlessBillingRequestFlow(billingRequestId: string, config: Config) {

        const response = await axios.post<{ billing_request_flows: { authorisation_url: string } }>(
            `${config.GOCARDLESS_API_URL}/billing_request_flows`,
            {
                billing_request_flows: {
                    lock_currency: true,
                    links: {
                        billing_request: billingRequestId,
                    },
                    exit_uri: config.FRONT_BORROW_EXIT_URL,
                    redirect_uri: config.FRONT_BORROW_REDIRECT_URL,
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${config.GOCARDLESS_API_SECRET}`,
                    'GoCardless-Version': '2015-07-06',
                    'Content-Type': 'application/json',
                },
            }
        );

        return response.data.billing_request_flows;
    }
}
