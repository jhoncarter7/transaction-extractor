import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
    baseURL: typeof window !== 'undefined'
        ? `${window.location.origin}/api/auth`
        : (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'),
})

export const { signIn, signUp, signOut, useSession } = authClient
