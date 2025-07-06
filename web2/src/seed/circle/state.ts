import fs from 'fs'

export type CircleStateType = {
    wireId: string
    cipherText: string
    recipientId: string
    walletId: string
    walletAddress: string
}

export class CircleState {

    private _value: Partial<CircleStateType>;

    constructor(params: Partial<CircleStateType> = {}) {
        this._value = params
    }


    get value(): Partial<CircleStateType> {
        return this._value
    }

    static fromJSON(json: string): CircleState {
        try {
            const obj = JSON.parse(json)
            return new CircleState(obj)
        } catch {
            return new CircleState()
        }
    }

    merge(data: Partial<CircleStateType>): CircleState {
        return new CircleState({
            wireId: data.wireId ?? this._value.wireId,
            cipherText: data.cipherText ?? this._value.cipherText,
            recipientId: data.recipientId ?? this._value.recipientId,
            walletAddress: data.walletAddress ?? this._value.walletAddress,
            walletId: data.walletId ?? this._value.walletId,
        })
    }

    toJSON(): string {
        return JSON.stringify(this._value, null, 2)
    }
} 