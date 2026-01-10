import { Suspense } from 'react'
import { AuthForm } from '@/components/auth-form'
import { Toaster } from '@/components/ui/sonner'

export const metadata = {
    title: 'Login - Transaction Extractor',
    description: 'Sign in to your account',
}

export default function LoginPage() {
    return (
        <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
            <Suspense fallback={<div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />}>
                <AuthForm mode="login" />
            </Suspense>
            <Toaster position="top-center" richColors />
        </main>
    )
}
