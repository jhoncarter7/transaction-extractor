import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000',
    // Include credentials for cross-origin requests (needed for cookies)
    fetchOptions: {
        credentials: 'include' as RequestCredentials,
    },
})

export const { signIn, signUp, signOut, useSession } = authClient
