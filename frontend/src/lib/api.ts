const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'

export interface Transaction {
    id: string
    date: string
    description: string
    amount: number
    balanceAfter: number | null
    type: 'credit' | 'debit'
    confidence: number
    createdAt: string
    updatedAt: string
}

export interface PaginatedResponse<T> {
    data: T[]
    nextCursor: string | null
    hasMore: boolean
    total: number
}

export interface ExtractResponse {
    success: boolean
    transaction?: Transaction
    error?: string
}

async function fetchWithAuth(url: string, options: RequestInit = {}) {
    const response = await fetch(url, {
        ...options,
        credentials: 'include', // Include cookies for session auth
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    })

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }))
        throw new Error(error.message || `HTTP ${response.status}`)
    }

    return response.json()
}

export async function extractTransaction(text: string): Promise<ExtractResponse> {
    return fetchWithAuth(`${API_BASE_URL}/api/transactions/extract`, {
        method: 'POST',
        body: JSON.stringify({ text }),
    })
}

export async function getTransactions(
    cursor?: string,
    limit: number = 10
): Promise<PaginatedResponse<Transaction>> {
    const params = new URLSearchParams()
    if (cursor) params.set('cursor', cursor)
    params.set('limit', limit.toString())

    const response = await fetchWithAuth(`${API_BASE_URL}/api/transactions?${params.toString()}`)

    // Map backend response format to frontend expected format
    // Backend returns { transactions, nextCursor, hasMore }
    // Frontend expects { data, nextCursor, hasMore, total }
    // Also map 'balance' -> 'balanceAfter'
    const mappedTransactions = (response.transactions || []).map((t: Record<string, unknown>) => ({
        ...t,
        balanceAfter: t.balance ?? null,
        updatedAt: t.updatedAt || t.createdAt,
    }))

    return {
        data: mappedTransactions,
        nextCursor: response.nextCursor || null,
        hasMore: response.hasMore || false,
        total: mappedTransactions.length,
    }
}
