import { Navigate } from 'react-router-dom';
import { GlobalNav } from '@/components/GlobalNav';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
type PageLayoutProps = {
  children: React.ReactNode;
};
export function PageLayout({ children }: PageLayoutProps) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="h-dvh w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return (
    <div className="h-dvh flex flex-col bg-background text-foreground overflow-hidden md:min-h-screen md:overflow-auto">
      <GlobalNav />
      <main className="flex-1 overflow-y-auto pb-24 md:pb-12 relative z-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-8 md:py-10 lg:py-12">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}