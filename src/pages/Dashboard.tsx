import React, { memo, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api-client';
import { PageLayout } from '@/components/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowRight, BarChart, Bell, BookOpen, Cable, Camera, Users, Weight, PieChart as PieChartIcon, Settings } from 'lucide-react';
import { format } from 'date-fns';
import type { InventoryLedgerEntry, Supplier, Transaction, EPRReport } from '@shared/types';
import { useOfflineStore } from '@/stores/useOfflineStore';
import { useAuth } from '@/hooks/useAuth';
const KpiCard = memo(({ title, value, icon: Icon, isLoading }: { title: string; value: string | number; icon: React.ElementType; isLoading: boolean }) => (
  <Card className="group hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300 backdrop-blur-xl shadow-glow shadow-primary/20 group-hover:shadow-primary/40 bg-card/80">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      {isLoading ? <Skeleton className="h-10 w-3/4 animate-pulse" /> : <div className="text-[clamp(1.5rem,6vw,2.5rem)] font-bold">{value}</div>}
    </CardContent>
  </Card>
));
const RecentActivityTable = memo(({ title, data, columns, isLoading, viewAllLink }: { title: string; data: any[]; columns: { header: string; accessor: (item: any) => React.ReactNode }[]; isLoading: boolean; viewAllLink?: string }) => (
  <Card className="col-span-1 lg:col-span-2 group hover:-translate-y-1 hover:scale-[1.01] transition-all duration-300 backdrop-blur-xl shadow-glow shadow-primary/20 group-hover:shadow-primary/40 bg-card/80">
    <CardHeader className="flex flex-row items-center justify-between">
      <CardTitle>{title}</CardTitle>
      {viewAllLink && <Button asChild variant="link" className="text-primary"><Link to={viewAllLink}>View All <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>}
    </CardHeader>
    <CardContent>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow>{columns.map(c => <TableHead key={c.header}>{c.header}</TableHead>)}</TableRow></TableHeader>
          <TableBody>
            {isLoading ? Array.from({ length: 3 }).map((_, i) => <TableRow key={i}>{columns.map((c, j) => <TableCell key={j}><Skeleton className="h-6 w-full animate-pulse" /></TableCell>)}</TableRow>)
             : data && data.length > 0 ? data.map((item, i) => <TableRow key={i} style={{ animationDelay: `${i * 0.05}s` }} className="animate-fade-in">{columns.map(c => <TableCell key={c.header}>{c.accessor(item)}</TableCell>)}</TableRow>)
             : <TableRow><TableCell colSpan={columns.length} className="text-center h-24">No recent activity.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </CardContent>
  </Card>
));
const DashboardContent = memo(() => {
  const { user } = useAuth();
  const { data: dashboardData, isLoading: isLoadingDashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api<any>('/api/dashboard'),
    enabled: !!user,
  });
  const { data: eprData, isLoading: isLoadingEpr } = useQuery({
    queryKey: ['epr-report'],
    queryFn: () => api<EPRReport>('/api/epr-report'),
    enabled: !!user && (user.role === 'admin' || user.role === 'auditor'),
  });
  const summary = dashboardData?.summary || {};
  const isLoading = isLoadingDashboard || (user && ['admin', 'auditor'].includes(user.role) && isLoadingEpr);
  if (!user) return null;
  return (
    <Suspense fallback={<div className="grid place-items-center h-64"><Skeleton className="h-12 w-full rounded-lg" /></div>}>
      {(() => {
        switch (user.role) {
          case 'operator':
            return (
              <div className="grid gap-4 md:gap-6 lg:gap-8 md:grid-cols-2 lg:grid-cols-3">
                <Card className="md:col-span-2 lg:col-span-3 bg-primary text-primary-foreground shadow-glow-lg shadow-primary/50">
                  <CardHeader><CardTitle>Operator Quick Actions</CardTitle></CardHeader>
                  <CardContent className="flex flex-col sm:flex-row gap-4 items-center">
                    <p className="flex-1 text-lg">Ready to start a new weighing session?</p>
                    <Button asChild size="lg" variant="secondary" className="font-bold text-lg h-14 w-full sm:w-auto hover:scale-105 transition-transform">
                      <Link to="/quick-weight"><Weight className="mr-2 h-6 w-6" /> Start Weighing</Link>
                    </Button>
                  </CardContent>
                </Card>
                <RecentActivityTable
                  title="Recent Transactions"
                  data={summary.recentTransactions || []}
                  isLoading={isLoading}
                  viewAllLink="/transactions"
                  columns={[
                    { header: 'ID', accessor: (t: Transaction) => <span className="font-mono text-xs">{t.id.substring(0, 8)}...</span> },
                    { header: 'Amount', accessor: (t: Transaction) => `R ${t.amount.toFixed(2)}` },
                    { header: 'Date', accessor: (t: Transaction) => format(new Date(t.transaction_timestamp), 'PP') },
                  ]}
                />
                <Card className="backdrop-blur-xl shadow-glow shadow-primary/20 bg-card/80">
                  <CardHeader><CardTitle>Hardware Status</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between"><span className="flex items-center gap-2"><Cable className="h-5 w-5" /> Serial Scale</span><Badge variant={dashboardData?.hardwareStatus?.scale === 'connected' ? 'default' : 'destructive'} className="bg-green-600">{dashboardData?.hardwareStatus?.scale}</Badge></div>
                    <div className="flex items-center justify-between"><span className="flex items-center gap-2"><Camera className="h-5 w-5" /> IP Camera</span><Badge variant={dashboardData?.hardwareStatus?.camera === 'healthy' ? 'default' : 'destructive'} className="bg-green-600">{dashboardData?.hardwareStatus?.camera}</Badge></div>
                  </CardContent>
                </Card>
              </div>
            );
          case 'manager':
            return (
              <div className="grid gap-4 md:gap-6 lg:gap-8 md:grid-cols-2 lg:grid-cols-4">
                <KpiCard title="Total Weight (kg)" value={summary.totalWeight?.toFixed(2) || 0} icon={Weight} isLoading={isLoading} />
                <KpiCard title="Total Value (ZAR)" value={`R ${summary.totalValue?.toFixed(2) || 0}`} icon={BarChart} isLoading={isLoading} />
                <KpiCard title="Total EPR Fees (ZAR)" value={`R ${summary.totalEPR?.toFixed(2) || 0}`} icon={BookOpen} isLoading={isLoading} />
                <KpiCard title="Recent Suppliers" value={summary.recentSuppliers?.length || 0} icon={Users} isLoading={isLoading} />
                <RecentActivityTable title="Recent Ledger Entries" data={summary.recentLedger || []} isLoading={isLoading} viewAllLink="/ledger" columns={[{ header: 'Material', accessor: (l: InventoryLedgerEntry) => l.material_type }, { header: 'Weight (kg)', accessor: (l: InventoryLedgerEntry) => l.weight_kg.toFixed(2) }, { header: 'Date', accessor: (l: InventoryLedgerEntry) => format(new Date(l.capture_timestamp), 'PP') }]} />
              </div>
            );
          case 'admin':
            return (
              <div className="grid gap-4 md:gap-6 lg:gap-8 md:grid-cols-2 lg:grid-cols-4">
                <KpiCard title="Total Weight (kg)" value={summary.totalWeight?.toFixed(2) || 0} icon={Weight} isLoading={isLoading} />
                <KpiCard title="Total Value (ZAR)" value={`R ${summary.totalValue?.toFixed(2) || 0}`} icon={BarChart} isLoading={isLoading} />
                <KpiCard title="EPR Compliance" value={`${eprData?.compliance_pct.toFixed(1) || 0}%`} icon={PieChartIcon} isLoading={isLoading} />
                <KpiCard title="Active Users" value={summary.userCount || 0} icon={Users} isLoading={isLoading} />
                <RecentActivityTable title="Recent Suppliers" data={summary.recentSuppliers || []} isLoading={isLoading} viewAllLink="/suppliers" columns={[{ header: 'Name', accessor: (s: Supplier) => s.name }, { header: 'EPR Number', accessor: (s: Supplier) => s.epr_number || 'N/A' }, { header: 'WEEE', accessor: (s: Supplier) => s.is_weee_compliant ? 'Yes' : 'No' }]} />
                <Card className="col-span-1 lg:col-span-2 bg-secondary/50 backdrop-blur-xl shadow-glow shadow-primary/20">
                  <CardHeader><CardTitle>Admin Tools</CardTitle></CardHeader>
                  <CardContent><Button asChild className="w-full h-14 text-lg"><Link to="/settings"><Settings className="mr-2 h-5 w-5" /> Go to Settings</Link></Button></CardContent>
                </Card>
              </div>
            );
          case 'auditor':
            return (
              <div className="grid gap-4 md:gap-6 lg:gap-8 md:grid-cols-2 lg:grid-cols-3">
                <KpiCard title="Total Weight Audited (kg)" value={summary.totalWeight?.toFixed(2) || 0} icon={Weight} isLoading={isLoading} />
                <KpiCard title="Total EPR Fees (ZAR)" value={`R ${eprData?.total_fees.toFixed(2) || 0}`} icon={BookOpen} isLoading={isLoading} />
                <KpiCard title="WEEE Compliance" value={`${eprData?.compliance_pct.toFixed(1) || 0}%`} icon={PieChartIcon} isLoading={isLoading} />
                <RecentActivityTable title="Recent Ledger Entries" data={summary.recentLedger || []} isLoading={isLoading} viewAllLink="/ledger" columns={[{ header: 'Material', accessor: (l: InventoryLedgerEntry) => l.material_type }, { header: 'Weight (kg)', accessor: (l: InventoryLedgerEntry) => l.weight_kg.toFixed(2) }, { header: 'Date', accessor: (l: InventoryLedgerEntry) => format(new Date(l.capture_timestamp), 'PP') }]} />
              </div>
            );
          default:
            return <p>No dashboard view available for your role.</p>;
        }
      })()}
    </Suspense>
  );
});
export function Dashboard() {
  const { user } = useAuth();
  const totalPending = useOfflineStore(s => s.totalPending());
  return (
    <PageLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h1 className="text-[clamp(2rem,5vw,3rem)] font-display font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {user?.username}! Here's your overview.</p>
          </div>
          {totalPending > 0 && (
            <Alert variant="default" className="w-full sm:w-auto bg-yellow-500/10 border-yellow-500/50 text-yellow-200 animate-pulse">
              <Bell className="h-4 w-4 !text-yellow-400" />
              <AlertTitle>Pending Sync</AlertTitle>
              <AlertDescription>{totalPending} items are waiting to be synced.</AlertDescription>
            </Alert>
          )}
        </div>
        <DashboardContent />
      </div>
    </PageLayout>
  );
}