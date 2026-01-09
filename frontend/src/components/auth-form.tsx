'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { signIn, signUp } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { toast } from 'sonner'

const loginSchema = z.object({
    email: z.string().email('Please enter a valid email'),
    password: z.string().min(1, 'Password is required'),
})

const registerSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
})

type LoginFormValues = z.infer<typeof loginSchema>
type RegisterFormValues = z.infer<typeof registerSchema>

interface AuthFormProps {
    mode: 'login' | 'register'
}

export function AuthForm({ mode }: AuthFormProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)

    const isLogin = mode === 'login'
    const schema = isLogin ? loginSchema : registerSchema

    const form = useForm<LoginFormValues | RegisterFormValues>({
        resolver: zodResolver(schema),
        defaultValues: isLogin
            ? { email: '', password: '' }
            : { name: '', email: '', password: '', confirmPassword: '' },
    })

    async function onSubmit(values: LoginFormValues | RegisterFormValues) {
        setIsLoading(true)

        try {
            if (isLogin) {
                const { email, password } = values as LoginFormValues
                const result = await signIn.email({
                    email,
                    password,
                })

                if (result.error) {
                    toast.error(result.error.message || 'Invalid credentials')
                    return
                }

                toast.success('Welcome back!')
                router.push('/')
                router.refresh()
            } else {
                const { name, email, password } = values as RegisterFormValues
                const result = await signUp.email({
                    name,
                    email,
                    password,
                })

                if (result.error) {
                    toast.error(result.error.message || 'Registration failed')
                    return
                }

                toast.success('Account created successfully!')
                router.push('/')
                router.refresh()
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Something went wrong')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Card className="w-full max-w-md mx-auto shadow-xl">
            <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold text-center">
                    {isLogin ? 'Welcome Back' : 'Create Account'}
                </CardTitle>
                <CardDescription className="text-center">
                    {isLogin
                        ? 'Enter your credentials to access your account'
                        : 'Enter your details to create your account'}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        {!isLogin && (
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Name</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="John Doe"
                                                disabled={isLoading}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="email"
                                            placeholder="you@example.com"
                                            disabled={isLoading}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Password</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="password"
                                            placeholder="••••••••"
                                            disabled={isLoading}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {!isLogin && (
                            <FormField
                                control={form.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Confirm Password</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="password"
                                                placeholder="••••••••"
                                                disabled={isLoading}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? (
                                <span className="flex items-center gap-2">
                                    <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                                    {isLogin ? 'Signing in...' : 'Creating account...'}
                                </span>
                            ) : (
                                <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                            )}
                        </Button>
                    </form>
                </Form>
            </CardContent>
            <CardFooter className="flex justify-center">
                <p className="text-sm text-muted-foreground">
                    {isLogin ? "Don't have an account? " : 'Already have an account? '}
                    <Link
                        href={isLogin ? '/register' : '/login'}
                        className="font-medium text-primary hover:underline"
                    >
                        {isLogin ? 'Sign up' : 'Sign in'}
                    </Link>
                </p>
            </CardFooter>
        </Card>
    )
}
