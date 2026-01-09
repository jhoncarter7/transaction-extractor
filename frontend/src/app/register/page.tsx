import { AuthForm } from '@/components/auth-form'
import { Toaster } from '@/components/ui/sonner'

export const metadata = {
    title: 'Register - Transaction Extractor',
    description: 'Create your account',
}

export default function RegisterPage() {
    return (
        <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
            <AuthForm mode="register" />
            <Toaster position="top-center" richColors />
        </main>
    )
}
