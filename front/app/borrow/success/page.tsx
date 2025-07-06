export default async function BorrowSuccessPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <h1 className="text-2xl font-bold mb-4">Borrow Request Successful</h1>
            <p className="text-muted-foreground">Your borrow request has been submitted successfully!</p>
            <p className="text-muted-foreground mt-2">Please check your email for further instructions.</p>
        </div>
    )
}