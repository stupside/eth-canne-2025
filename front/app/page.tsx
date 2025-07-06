import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
      <h1 className="text-4xl font-bold">Simple dApp</h1>
      <p className="text-muted-foreground text-center max-w-md">
        Connect your MetaMask wallet to start borrowing or lending
      </p>
      <div className="flex gap-4">
        <Button asChild>
          <Link href="/borrow">Borrow</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/lend">Lend</Link>
        </Button>
      </div>
    </div>
  )
}
