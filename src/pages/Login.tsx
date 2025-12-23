import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { api } from '@/lib/api-client';
import type { User } from '@shared/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Toaster, toast } from 'sonner';
import { HardHat, Loader2 } from 'lucide-react';
type LoginFormInputs = {
  username: string;
  password: string;
};
type LoginResponse = {
  user: User;
  token: string;
};
export function Login() {
  const navigate = useNavigate();
  const loginAction = useAuthStore((s) => s.login);
  const { register, handleSubmit } = useForm<LoginFormInputs>();
  // Ensure system is seeded on first load to prevent "User not found" errors
  useQuery({
    queryKey: ['auth-init'],
    queryFn: () => api<{ seeded: boolean }>('/api/auth/init'),
    retry: 3,
  });
  const mutation = useMutation({
    mutationFn: (credentials: LoginFormInputs) => api<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
    onSuccess: (data) => {
      loginAction(data.user, data.token);
      toast.success(`Welcome back, ${data.user.username}!`);
      if (data.user.role === 'operator') {
        navigate('/quick-weight');
      } else {
        navigate('/');
      }
    },
    onError: (error) => {
      toast.error('Login Failed', { description: error.message });
    },
  });
  const onSubmit = (data: LoginFormInputs) => {
    mutation.mutate(data);
  };
  return (
    <div className="w-full h-dvh bg-[#0B0B0B] text-white flex items-center justify-center p-4">
      <div className="absolute inset-0 -z-10 h-full w-full bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"></div>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 bg-[#38761d]/20 blur-[150px] -z-20"></div>
      <Card className="w-full max-w-md bg-card/80 border-border/50 backdrop-blur-sm shadow-2xl shadow-black/50 animate-fade-in">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 flex items-center justify-center rounded-full bg-primary/10 shadow-lg shadow-primary/20">
            <HardHat className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">SuiteWaste OS</CardTitle>
          <CardDescription>Enter your credentials to access the system.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input 
                id="username" 
                type="text" 
                placeholder="e.g., operator1" 
                required 
                {...register('username')} 
                className="bg-secondary/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password / PIN</Label>
              <Input 
                id="password" 
                type="password" 
                required 
                {...register('password')} 
                className="bg-secondary/50"
              />
            </div>
            <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Log In'}
            </Button>
          </form>
        </CardContent>
      </Card>
      <Toaster richColors theme="dark" />
    </div>
  );
}