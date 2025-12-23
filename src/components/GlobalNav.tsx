import { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { HardHat, Menu, LayoutDashboard, Weight, Users, BookOpen, Settings2, LogOut, FileText, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ThemeToggle } from '@/components/ThemeToggle';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/useAuthStore';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['operator', 'manager', 'admin', 'auditor'] },
  { href: '/quick-weight', label: 'Weigh', icon: Weight, roles: ['operator', 'manager', 'admin'] },
  { href: '/suppliers', label: 'Suppliers', icon: Users, roles: ['manager', 'admin'] },
  { href: '/ledger', label: 'Ledger', icon: BookOpen, roles: ['manager', 'admin', 'auditor'] },
  { href: '/transactions', label: 'Transactions', icon: FileText, roles: ['manager', 'admin', 'auditor'] },
  { href: '/chat', label: 'Chat', icon: MessageCircle, roles: ['operator','manager','admin','auditor'], features: ['chat-access'] },
  { href: '/hardware', label: 'Hardware', icon: Settings2, roles: ['admin'] },
  { href: '/settings', label: 'Settings', icon: Settings2, roles: ['admin'] },
];
export function GlobalNav() {
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuth();
  const logout = useAuthStore(s => s.logout);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const handleLogout = async () => {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.warn("Logout endpoint failed, proceeding with local cleanup");
    } finally {
      logout();
      queryClient.clear();
      toast.success("Logged out successfully");
      navigate('/login', { replace: true });
    }
  };
  const accessibleNavItems = navItems.filter(item =>
    user &&
    item.roles.includes(user.role) &&
    (!item.features || item.features.every(f => user.features?.includes(f)))
  );
  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:block hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-6">
              <Link to="/" className="flex items-center gap-2">
                <HardHat className="h-7 w-7 text-primary" />
                <span className="text-lg font-bold tracking-tighter">SuiteWaste OS</span>
              </Link>
              <nav className="flex items-center gap-1">
                {accessibleNavItems.map((item) => (
                  <NavLink key={item.href} to={item.href} className={({ isActive }) => cn("flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors", isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")}>
                    <item.icon className="h-4 w-4" /> {item.label}
                  </NavLink>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle className="relative top-0 right-0" />
              <Button onClick={handleLogout} variant="ghost" size="icon" aria-label="Logout"><LogOut className="h-5 w-5" /></Button>
            </div>
          </div>
        </div>
      </header>
      {/* Mobile Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-24 bg-background/95 backdrop-blur-sm border-t z-50 pb-[env(safe-area-inset-bottom)]">
         <div className="grid h-full max-w-lg grid-cols-5 mx-auto">
            {accessibleNavItems.slice(0, 4).map(item => (
                 <NavLink key={item.href} to={item.href} className={({isActive}) => cn("inline-flex flex-col items-center justify-center px-1 group", isActive ? "text-primary" : "text-muted-foreground")}>
                    <item.icon className="w-6 h-6 mb-1" />
                    <span className="text-[10px]">{item.label}</span>
                </NavLink>
            ))}
             <Sheet open={isMobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                    <button className="flex flex-col items-center justify-center text-muted-foreground"><Menu className="w-6 h-6 mb-1" /><span className="text-[10px]">More</span></button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-auto p-6 rounded-t-3xl pb-[max(2.5rem,env(safe-area-inset-bottom))]">
                    <div className="grid grid-cols-3 gap-4">
                      {accessibleNavItems.map(item => (
                        <NavLink key={item.href} to={item.href} onClick={() => setMobileMenuOpen(false)} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-accent/50 text-xs font-medium">
                          <item.icon className="h-6 w-6" /> {item.label}
                        </NavLink>
                      ))}
                    </div>
                    <Button onClick={handleLogout} variant="outline" className="w-full mt-6 h-12 rounded-xl text-destructive"><LogOut className="mr-2 h-4 w-4" /> Logout</Button>
                </SheetContent>
            </Sheet>
         </div>
      </div>
    </>
  );
}