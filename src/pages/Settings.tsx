import React, { useState, useMemo, memo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageLayout } from '@/components/PageLayout';
import { api } from '@/lib/api-client';
import type { User, EPRReport, ConfigUserUpdate } from '@shared/types';
import { useAuthStore } from '@/stores/useAuthStore';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShieldAlert, Download, Loader2, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
const COLORS = ['#38761d', '#5a9a47', '#7cb870', '#a0d69a', '#c5f4c3', '#e7f9e6'];
const EPR_STREAMS = ['Plastic', 'Paper & Packaging', 'Glass', 'Metals', 'Electrical & Electronic', 'Other'];
const UserRolesTable = memo(() => {
  const queryClient = useQueryClient();
  const { data: users } = useQuery({
    queryKey: ['config-users'],
    queryFn: () => api<Omit<User, 'password_hash'>[]>('/api/config/users'),
  });
  const [userChanges, setUserChanges] = useState<Map<string, ConfigUserUpdate>>(new Map());
  const mutation = useMutation({
    mutationFn: (updates: ConfigUserUpdate[]) => api('/api/config/users', {
      method: 'POST',
      body: JSON.stringify(updates),
    }),
    onSuccess: () => {
      toast.success('Configurations saved');
      setUserChanges(new Map());
      queryClient.invalidateQueries({ queryKey: ['config-users'] });
    },
    onError: (e) => toast.error(e.message),
  });
  const handleFieldChange = (userId: string, field: keyof ConfigUserUpdate, value: any) => {
    const user = users?.find(u => u.id === userId);
    if (!user) return;
    setUserChanges(prev => {
      const next = new Map(prev);
      const curr = next.get(userId) || { id: userId, role: user.role, active: user.active, features: user.features || [] };
      (curr as any)[field] = value;
      next.set(userId, curr);
      return next;
    });
  };
  return (
    <Card className="bg-card/80 border-border backdrop-blur-xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>User Permissions</CardTitle>
          <p className="text-sm text-muted-foreground">Manage roles and feature access.</p>
        </div>
        <Button onClick={() => mutation.mutate(Array.from(userChanges.values()))} disabled={userChanges.size === 0 || mutation.isPending}>
          {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Role</TableHead><TableHead>Active</TableHead><TableHead>Features (Comma Separated)</TableHead></TableRow></TableHeader>
            <TableBody>
              {users?.map(u => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.username}</TableCell>
                  <TableCell>
                    <Select value={userChanges.get(u.id)?.role || u.role} onValueChange={v => handleFieldChange(u.id, 'role', v)}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="operator">Operator</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="auditor">Auditor</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell><Switch checked={userChanges.get(u.id)?.active ?? u.active} onCheckedChange={v => handleFieldChange(u.id, 'active', v)} /></TableCell>
                  <TableCell><Input className="h-9" value={(userChanges.get(u.id)?.features || u.features || []).join(', ')} onChange={e => handleFieldChange(u.id, 'features', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
});
const SecurityTab = memo(() => {
  const mutation = useMutation({
    mutationFn: () => api('/api/admin/sessions/clear', { method: 'POST' }),
    onSuccess: (data: any) => toast.success(`Cleared ${data.cleared} active sessions. All users logged out.`),
    onError: (e) => toast.error('Security action failed: ' + e.message),
  });
  return (
    <div className="space-y-6">
      <Card className="bg-destructive/5 border-destructive/20 border-2">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2"><ShieldAlert className="h-6 w-6" /> Critical Security Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-4 rounded-lg bg-card/50 border border-destructive/10">
            <div className="space-y-1">
              <h3 className="text-lg font-bold">Terminate All Global Sessions</h3>
              <p className="text-sm text-muted-foreground max-w-md">Forces immediate session invalidation for every active account. Useful for emergency system audits or widespread security resets.</p>
            </div>
            <Button variant="destructive" size="lg" className="h-14 px-8 font-semibold shadow-lg shadow-destructive/20" onClick={() => { if(confirm("Are you absolutely sure? This will terminate all active connections to SuiteWaste OS immediately.")) mutation.mutate(); }}>
              {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-5 w-5" />} Terminate All Sessions
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});
const EprReportingTab = memo(() => {
  const { data: report } = useQuery({ queryKey: ['epr-report'], queryFn: () => api<EPRReport>('/api/epr-report') });
  const streamData = useMemo(() => {
    if (!report || !report.streams) return [];
    return EPR_STREAMS.map(s => ({ name: s, weight: report.streams[s]?.weight || 0, fees: report.streams[s]?.fees || 0 })).filter(s => s.weight > 0);
  }, [report]);
  const handleDownloadAudit = () => {
    if (!report) return;
    const timestamp = new Date().toISOString();
    const streamsXml = streamData.map(s => `
    <Stream name="${s.name}">
      <WeightKg>${s.weight.toFixed(2)}</WeightKg>
      <FeesZar>${s.fees.toFixed(2)}</FeesZar>
    </Stream>`).join('');
    const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
<EPRComplianceReport generated="${timestamp}">
  <CompliancePercentage>${report.compliance_pct.toFixed(2)}</CompliancePercentage>
  <TotalFeesZAR>${report.total_fees.toFixed(2)}</TotalFeesZAR>
  <Streams>${streamsXml}
  </Streams>
  <AuditHash>${crypto.randomUUID()}</AuditHash>
</EPRComplianceReport>`;
    const blob = new Blob([xmlString], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `epr_compliance_report_${new Date().getTime()}.xml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("EPR Compliance Audit exported successfully");
  };
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-1 bg-card/80 border-border">
        <CardHeader><CardTitle>Compliance Metrics</CardTitle></CardHeader>
        <CardContent className="space-y-8 py-6">
          <div className="text-center p-6 bg-primary/5 rounded-2xl border border-primary/10">
            <div className="text-5xl font-bold text-primary">{report?.compliance_pct?.toFixed(1) ?? '0.0'}%</div>
            <p className="text-sm font-medium text-muted-foreground mt-2">Overall Compliance</p>
          </div>
          <div className="text-center p-6 bg-accent/5 rounded-2xl border border-accent/10">
            <div className="text-4xl font-bold">R {report?.total_fees?.toFixed(2) ?? '0.00'}</div>
            <p className="text-sm font-medium text-muted-foreground mt-2">Total Accrued EPR Fees</p>
          </div>
          <Button className="w-full h-14 text-lg font-semibold shadow-glow shadow-primary/20" onClick={handleDownloadAudit}>
            <Download className="mr-2 h-5 w-5" /> Download PRO XML Audit
          </Button>
        </CardContent>
      </Card>
      <Card className="lg:col-span-2 bg-card/80 border-border">
        <CardHeader><CardTitle>EPR Stream Weight Distribution</CardTitle></CardHeader>
        <CardContent className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={streamData} dataKey="weight" nameKey="name" cx="50%" cy="50%" outerRadius={120} labelLine={true} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {streamData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(value: number) => [`${value.toFixed(2)} kg`, 'Weight']} />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
});
export function Settings() {
  const user = useAuthStore(s => s.user);
  if (user?.role !== 'admin') {
    return (
      <PageLayout>
        <Alert variant="destructive" className="max-w-2xl mx-auto">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Administrative Access Required</AlertTitle>
        </Alert>
      </PageLayout>
    );
  }
  return (
    <PageLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-display font-bold tracking-tight">System Settings</h1>
          <p className="text-muted-foreground mt-1 text-lg">Manage global compliance, user permissions, and system security.</p>
        </div>
        <Tabs defaultValue="roles" className="space-y-6">
          <TabsList className="bg-muted p-1 rounded-xl h-12 inline-flex items-center">
            <TabsTrigger value="roles" className="px-6 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm h-full">User Roles</TabsTrigger>
            <TabsTrigger value="epr" className="px-6 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm h-full">Compliance (EPR)</TabsTrigger>
            <TabsTrigger value="security" className="px-6 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm h-full">System Security</TabsTrigger>
          </TabsList>
          <TabsContent value="roles" className="animate-in fade-in-50 duration-500"><UserRolesTable /></TabsContent>
          <TabsContent value="epr" className="animate-in fade-in-50 duration-500"><EprReportingTab /></TabsContent>
          <TabsContent value="security" className="animate-in fade-in-50 duration-500"><SecurityTab /></TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
}