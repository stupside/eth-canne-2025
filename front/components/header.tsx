import { WalletButton } from "./wallet-button"

export async function Header() {
  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">dApp</h1>
        <WalletButton />
      </div>
    </header>
  )
}
