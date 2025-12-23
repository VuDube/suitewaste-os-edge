import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { InventoryLedgerEntry, Supplier } from '@shared/types';
import { PageLayout } from '@/components/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { BarChart, PieChart, ResponsiveContainer, Bar, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { CheckCircle, CircleDashed } from 'lucide-react';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
const COLORS = ['#38761d', '#5a9a47', '#7cb870', '#a0d69a', '#c5f4c3'];
const PAGE_SIZE = 10;
export function InventoryLedger() {
  const [materialFilter, setMaterialFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const { data: ledgerEntries, isLoading: isLoadingLedger } = useQuery({
    queryKey: ['ledger'],
    queryFn: () => api<InventoryLedgerEntry[]>('/api/ledger'),
  });
  const { data: suppliers, isLoading: isLoadingSuppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => api<Supplier[]>('/api/suppliers'),
  });
  const filteredEntries = useMemo(() => {
    const from = dateFrom ? new Date(dateFrom).getTime() : 0;
    const to = dateTo ? new Date(dateTo).getTime() + 86400000 : Infinity; // include whole day
    return ledgerEntries
      ?.filter(entry =>
        (supplierFilter === 'all' || entry.supplier_id === supplierFilter) &&
        (materialFilter === '' || entry.material_type.toLowerCase().includes(materialFilter.toLowerCase())) &&
        (entry.capture_timestamp >= from && entry.capture_timestamp <= to)
      )
      .sort((a, b) => b.capture_timestamp - a.capture_timestamp) || [];
  }, [ledgerEntries, supplierFilter, materialFilter, dateFrom, dateTo]);
  const totalPages = Math.ceil(filteredEntries.length / PAGE_SIZE);
  const paginatedEntries = filteredEntries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const weightByMaterial = useMemo(() => {
    const weights: { [key: string]: number } = {};
    filteredEntries.forEach(entry => {
      weights[entry.material_type] = (weights[entry.material_type] || 0) + entry.weight_kg;
    });
    return Object.entries(weights).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
  }, [filteredEntries]);
  const weightBySupplier = useMemo(() => {
    const weights: { [key: string]: number } = {};
    filteredEntries.forEach(entry => {
      const supplierName = suppliers?.find(s => s.id === entry.supplier_id)?.name || 'Unknown';
      weights[supplierName] = (weights[supplierName] || 0) + entry.weight_kg;
    });
    return Object.entries(weights).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
  }, [filteredEntries, suppliers]);
  return (
    <PageLayout>
      <div className="space-y-8">
        <h1 className="text-3xl font-bold tracking-tight">Inventory Ledger</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card><CardHeader><CardTitle>Weight by Material (kg)</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={300} className="!min-h-[250px] md:min-h-[300px]"><PieChart><Pie data={weightByMaterial} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>{weightByMaterial.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></CardContent></Card>
          <Card><CardHeader><CardTitle>Weight by Supplier (kg)</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={300} className="!min-h-[250px] md:min-h-[300px]"><BarChart data={weightBySupplier}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-30} textAnchor="end" height={70} /><YAxis /><Tooltip /><Legend /><Bar dataKey="value" fill="#38761d" /></BarChart></ResponsiveContainer></CardContent></Card>
        </div>
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
              <CardTitle>All Entries</CardTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:flex gap-2 w-full">
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full sm:w-auto h-14" />
                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full sm:w-auto h-14" />
                <Input placeholder="Filter by material..." value={materialFilter} onChange={e => setMaterialFilter(e.target.value)} className="w-full sm:w-auto h-14" />
                {isLoadingSuppliers ? <Skeleton className="h-14 w-full sm:w-[180px]" /> : (
                  <Select value={supplierFilter} onValueChange={setSupplierFilter}><SelectTrigger className="w-full sm:w-[180px] h-14"><SelectValue placeholder="Filter by supplier" /></SelectTrigger><SelectContent><SelectItem value="all">All Suppliers</SelectItem>{suppliers?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="min-w-full overflow-x-auto border rounded-lg">
              <Table>
                <TableHeader><TableRow><TableHead>Timestamp</TableHead><TableHead>Supplier</TableHead><TableHead>Material</TableHead><TableHead className="text-right">Weight (kg)</TableHead><TableHead className="text-center">Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {isLoadingLedger ? (Array.from({ length: 5 }).map((_, i) => (<TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>)))
                   : paginatedEntries.length > 0 ? (paginatedEntries.map(entry => (
                      <TableRow key={entry.id}>
                        <TableCell>{format(new Date(entry.capture_timestamp), 'PPpp')}</TableCell>
                        <TableCell>{suppliers?.find(s => s.id === entry.supplier_id)?.name || 'Unknown'}</TableCell>
                        <TableCell>{entry.material_type}</TableCell>
                        <TableCell className="text-right font-mono">{entry.weight_kg.toFixed(2)}</TableCell>
                        <TableCell className="text-center">{entry.is_synced ? <CheckCircle className="h-5 w-5 text-green-500 inline" /> : <CircleDashed className="h-5 w-5 text-yellow-500 inline animate-spin" />}</TableCell>
                      </TableRow>
                    )))
                   : (<TableRow><TableCell colSpan={5} className="text-center h-24">No ledger entries found for the selected filters.</TableCell></TableRow>)}
                </TableBody>
              </Table>
            </div>
            {totalPages > 1 && (
              <Pagination className="mt-4">
                <PaginationContent>
                  <PaginationItem><PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setPage(p => Math.max(1, p - 1)); }} /></PaginationItem>
                  {[...Array(totalPages)].map((_, i) => (
                    <PaginationItem key={i}><PaginationLink href="#" isActive={page === i + 1} onClick={(e) => { e.preventDefault(); setPage(i + 1); }}>{i + 1}</PaginationLink></PaginationItem>
                  ))}
                  <PaginationItem><PaginationNext href="#" onClick={(e) => { e.preventDefault(); setPage(p => Math.min(totalPages, p + 1)); }} /></PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}