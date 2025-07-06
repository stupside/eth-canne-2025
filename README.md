# Credura

**Crypto-Backed Buy Now, Pay Later Protocol (Powered by Direct Debit Repayments)**

Credura is a Buy Now, Pay Later (BNPL) protocol powered by crypto lenders. It enables users to purchase goods immediately by receiving USDC, while repaying later through deferred bank debits (e.g., via GoCardless). Financing is provided by individuals who lend their crypto in exchange for gradual returns.

---

## How It Works

- **Borrowers** receive USDC up front to make purchases.
- **Repayments** are made later via direct debit from the borrower's bank account (using GoCardless).
- **Lenders** provide crypto liquidity and earn returns as borrowers repay.
- **On/Off-Ramp:** When repayments are pulled from the bank account, funds are sent via Circle Wires to Circle Mint, then on-ramped to the protocol's Circle Dev Wallet using Circle Console.

---

## Key Technologies

- **Solidity Smart Contracts:** Core lending/borrowing logic, deployed and tested with Hardhat 3.
- **GoCardless:** Enables direct debit repayments with strong KYC and automated bank pulls.
- **Circle:** Used for fiat-to-USDC on-ramping and treasury management.
- **Next.js Frontend:** User interface for borrowers and lenders.
- **Node.js Backend:** API integrations for GoCardless, Circle, and protocol logic.
- **Moley CLI:** Used to securely expose local development services to the world using Cloudflare Tunnels and custom domains. See [Moley on GitHub](https://github.com/stupside/moley) for more details.

---

## Using Moley

[Moley](https://github.com/stupside/moley) is a CLI tool that automates the process of exposing your local applications to the internet using Cloudflare Tunnels and your own custom domains. It manages DNS records, tunnel creation, and configuration with a single YAML file and command. This project uses Moley to expose both the frontend and backend services for development and demo purposes.

**Key benefits:**
- No need for reverse proxies or manual DNS setup
- Automatic DNS and tunnel management
- Secure by default (Cloudflare Tunnels)
- Centralized configuration via `moley.yml`

**Basic usage:**
1. Install and authenticate `cloudflared`
2. Build and configure Moley (see [Moley README](https://github.com/stupside/moley#readme))
3. Edit `moley.yml` to expose your local services (see this repo's `moley.yml` for an example)
4. Run `./moley tunnel run` to go live

For more details, troubleshooting, and advanced configuration, see the [official Moley documentation](https://github.com/stupside/moley#readme).

---

## Monorepo Structure

```
credura/
  front/   # Next.js frontend (React, TypeScript, Tailwind)
  web2/    # Node.js backend (TypeScript, REST APIs for GoCardless, Circle, etc.)
  web3/    # Ethereum smart contracts (Solidity, Hardhat)
  moley.yml # Deployment configuration
```

---

## Getting Started

### 1. Frontend (`front/`)

- **Stack:** Next.js, React, TypeScript, Tailwind CSS
- **Usage:** Lending/borrowing UI, wallet integration

```bash
cd front
yarn install
yarn dev
# Runs at http://localhost:3000
```

---

### 2. Backend (`web2/`)

- **Stack:** Node.js, TypeScript
- **Usage:** REST APIs for Circle, GoCardless, and protocol logic

```bash
cd web2
yarn install
yarn start
# Runs at http://localhost:8080
```

---

### 3. Smart Contracts (`web3/`)

- **Stack:** Solidity, Hardhat 3
- **Usage:** Lending pool, whitelisting, deployment, automation

```bash
cd web3
yarn install
yarn hardhat compile
yarn hardhat test
```

---

## Deployment

Deployment is managed via `moley.yml`:

- **Backend:** Exposed at `back.xonery.dev` (port 8080)
- **Frontend:** Exposed at `front.xonery.dev` (port 3000)

---

## Development Notes

- All packages use Yarn 2+ (Berry).
- Node modules and build artifacts are gitignored.
- For contract deployment and automation (e.g., whitelisting wallets), see scripts in `web3/scripts/`.
- GoCardless is used for direct debit repayments and KYC.
- Circle is used for on/off-ramping between fiat and USDC.

---

## Contributing

1. Fork the repo and create your branch.
2. Make your changes and add tests.
3. Submit a pull request.

---

## License

MIT

---

## Contact

For questions or support, please open an issue or contact the maintainers. 