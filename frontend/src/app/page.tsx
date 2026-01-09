'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signOut, useSession } from '@/lib/auth-client'
import { TransactionInput } from '@/components/transaction-input'
import { TransactionsTable } from '@/components/transactions-table'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function DashboardPage() {
  const router = useRouter()
  const { data: session, isPending } = useSession()
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isPending && !session) {
      router.push('/login')
    }
  }, [session, isPending, router])

  const handleLogout = async () => {
    await signOut()
    toast.success('Logged out successfully')
    router.push('/login')
    router.refresh()
  }

  const handleTransactionAdded = () => {
    setRefreshTrigger((prev) => prev + 1)
  }

  // Show loading while checking auth or redirecting
  if (isPending || !session) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <span className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full" />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="border-b bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Transaction Extractor
            </h1>
            {session?.user && (
              <p className="text-sm text-muted-foreground">
                Welcome, {session.user.name || session.user.email}
              </p>
            )}
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <TransactionInput onSuccess={handleTransactionAdded} />
        <TransactionsTable refreshTrigger={refreshTrigger} />
      </div>
    </main>
  )
}
