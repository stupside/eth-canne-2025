import axios from 'axios';
import { Config } from '../../cfg';
import { Type } from '@sinclair/typebox';
import { FeeLevel, generateEntitySecretCiphertext } from '@circle-fin/developer-controlled-wallets';
import { v4 as uuidv4 } from 'uuid';

// Define type for contract execution data
export type ExecuteContractData = {
    parameters: any[];
    functionAbi: string;
};

export class CircleConsoleService {
    static async executeContract(walletId: string, data: ExecuteContractData, config: Config) {
        const ciphertext = await generateEntitySecretCiphertext({
            apiKey: config.CIRCLE_CONSOLE_API_SECRET,
            entitySecret: config.CIRCLE_CONSOLE_DEV_WALLET_SECRET,
        });


        try {
            const response = await axios.post<{
                id: string;
            }>(
                `${config.CIRCLE_CONSOLE_API_URL}/v1/w3s/developer/transactions/contractExecution`,
                {
                    walletId: walletId, // Circle wallet address
                    abiParameters: data.parameters, // Parameters for the function to call
                    idempotencyKey: uuidv4(), // UUID v4 idempotency key for exactly-once execution
                    contractAddress: config.POOL_WALLET_ADDRESS, // okay
                    abiFunctionSignature: data.functionAbi, // The function to call
                    entitySecretCiphertext: ciphertext, // ?
                    feeLevel: "LOW",
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${config.CIRCLE_CONSOLE_API_SECRET}`,
                    }
                }
            );

            return {
                id: response.data.id
            };
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Error Response Status:', error.response?.status);
                console.error('Error Response Data:', error.response?.data);
                console.error('Error Response Headers:', error.response?.headers);
            }
            throw new Error("Failed to execute contract on Circle Console");
        }
    }
}