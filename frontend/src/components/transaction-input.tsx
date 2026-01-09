'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { extractTransaction } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'

const transactionSchema = z.object({
    text: z.string().min(10, 'Please enter transaction details (at least 10 characters)'),
})

type TransactionFormValues = z.infer<typeof transactionSchema>

interface TransactionInputProps {
    onSuccess?: () => void
}

export function TransactionInput({ onSuccess }: TransactionInputProps) {
    const [isLoading, setIsLoading] = useState(false)

    const form = useForm<TransactionFormValues>({
        resolver: zodResolver(transactionSchema),
        defaultValues: { text: '' },
    })

    async function onSubmit(values: TransactionFormValues) {
        setIsLoading(true)

        try {
            const result = await extractTransaction(values.text)

            if (result.success && result.transaction) {
                toast.success('Transaction parsed and saved successfully!', {
                    description: `${result.transaction.description} - ${result.transaction.type === 'credit' ? '+' : '-'}₹${Math.abs(result.transaction.amount).toFixed(2)}`,
                })
                form.reset()
                onSuccess?.()
            } else {
                toast.error(result.error || 'Failed to parse transaction')
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to extract transaction')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="text-xl">Add Transaction</CardTitle>
                <CardDescription>
                    Paste your bank transaction text and we&apos;ll extract the details automatically
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="text"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Transaction Text</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder={`Example:
Date: 11 Dec 2025
Description: STARBUCKS COFFEE MUMBAI
Amount: -420.00
Balance after transaction: 18,420.50`}
                                            className="min-h-[150px] font-mono text-sm"
                                            disabled={isLoading}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? (
                                <span className="flex items-center gap-2">
                                    <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                                    Parsing...
                                </span>
                            ) : (
                                'Parse & Save'
                            )}
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    )
}
