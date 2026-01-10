'use client'

import { useEffect, useState, useCallback } from 'react'
import { getTransactions, Transaction } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'

interface TransactionsTableProps {
    refreshTrigger?: number
}

export function TransactionsTable({ refreshTrigger }: TransactionsTableProps) {
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [nextCursor, setNextCursor] = useState<string | null>(null)
    const [hasMore, setHasMore] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [isLoadingMore, setIsLoadingMore] = useState(false)

    const loadTransactions = useCallback(async (cursor?: string) => {
        try {
            const response = await getTransactions(cursor)

            // Safely handle response - ensure data array exists
            const data = response?.data || []

            if (cursor) {
                setTransactions((prev) => [...prev, ...data])
            } else {
                setTransactions(data)
            }

            setNextCursor(response?.nextCursor || null)
            setHasMore(response?.hasMore || false)
        } catch (error) {
            console.error('Failed to load transactions:', error)
            // Reset to empty on error
            if (!cursor) {
                setTransactions([])
            }
        } finally {
            setIsLoading(false)
            setIsLoadingMore(false)
        }
    }, [])

    useEffect(() => {
        setIsLoading(true)
        loadTransactions()
    }, [loadTransactions, refreshTrigger])

    const handleLoadMore = () => {
        if (!nextCursor) return
        setIsLoadingMore(true)
        loadTransactions(nextCursor)
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        })
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
        }).format(Math.abs(amount))
    }

    const getConfidenceBadge = (confidence: number) => {
        const percentage = Math.round(confidence)
        let colorClass = 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'

        if (percentage < 70) {
            colorClass = 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
        } else if (percentage < 85) {
            colorClass = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
        }

        return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}>
                {percentage}%
            </span>
        )
    }

    if (isLoading) {
        return (
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="text-xl">Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-center items-center py-12">
                        <span className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="text-xl">Transactions</CardTitle>
                <CardDescription>
                    {transactions.length === 0
                        ? 'No transactions yet. Add your first transaction above!'
                        : `Showing ${transactions.length} transaction${transactions.length === 1 ? '' : 's'}`}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {transactions.length > 0 ? (
                    <>
                        <div className="rounded-md border overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                        <TableHead className="text-right">Balance</TableHead>
                                        <TableHead className="text-center">Confidence</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transactions.map((transaction) => (
                                        <TableRow key={transaction.id}>
                                            <TableCell className="whitespace-nowrap">
                                                {formatDate(transaction.date)}
                                            </TableCell>
                                            <TableCell className="max-w-[200px] truncate" title={transaction.description}>
                                                {transaction.description}
                                            </TableCell>
                                            <TableCell
                                                className={`text-right font-medium ${transaction.type === 'credit'
                                                    ? 'text-green-600 dark:text-green-400'
                                                    : 'text-red-600 dark:text-red-400'
                                                    }`}
                                            >
                                                {transaction.type === 'credit' ? '+' : '-'}
                                                {formatCurrency(transaction.amount)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {transaction.balanceAfter != null
                                                    ? formatCurrency(transaction.balanceAfter)
                                                    : '-'}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {getConfidenceBadge(transaction.confidence)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {hasMore && (
                            <div className="mt-4 flex justify-center">
                                <Button
                                    variant="outline"
                                    onClick={handleLoadMore}
                                    disabled={isLoadingMore}
                                >
                                    {isLoadingMore ? (
                                        <span className="flex items-center gap-2">
                                            <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                                            Loading...
                                        </span>
                                    ) : (
                                        'Load More'
                                    )}
                                </Button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center py-8 text-muted-foreground">
                        <p>No transactions found</p>
                        <p className="text-sm mt-1">Paste transaction text above to get started</p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
