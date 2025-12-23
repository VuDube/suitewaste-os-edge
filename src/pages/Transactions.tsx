import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { Transaction, InventoryLedgerEntry, Supplier } from '@shared/types';
import { PageLayout } from '@/components/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Download } from 'lucide-react';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
const PAGE_SIZE = 10;
// Helper to map material types to EPR streams for mock reporting
const getEprStream = (materialType: string): string => {
  const lowerMat = materialType.toLowerCase();
  if (lowerMat.includes('plastic') || lowerMat.includes('pet')) return 'Plastic';
  if (lowerMat.includes('paper') || lowerMat.includes('cardboard')) return 'Paper & Packaging';
  if (lowerMat.includes('glass')) return 'Glass';
  if (lowerMat.includes('copper') || lowerMat.includes('aluminum') || lowerMat.includes('steel') || lowerMat.includes('metal')) return 'Metals';
  if (lowerMat.includes('electronic') || lowerMat.includes('weee') || lowerMat.includes('battery')) return 'Electrical & Electronic';
  return 'Other';
};
export function Transactions() {
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const { data: transactions, isLoading: isLoadingTransactions } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => api<Transaction[]>('/api/transactions'),
  });
  const { data: ledgerEntries } = useQuery({ queryKey: ['ledger'], queryFn: () => api<InventoryLedgerEntry[]>('/api/ledger') });
  const { data: suppliers } = useQuery({ queryKey: ['suppliers'], queryFn: () => api<Supplier[]>('/api/suppliers') });
  const filteredTransactions = useMemo(() => {
    const from = dateFrom ? new Date(dateFrom).getTime() : 0;
    const to = dateTo ? new Date(dateTo).getTime() + 86400000 : Infinity;
    return transactions
      ?.filter(t =>
        (t.id.toLowerCase().includes(search.toLowerCase()) || t.ledger_entry_id.toLowerCase().includes(search.toLowerCase())) &&
        (t.transaction_timestamp >= from && t.transaction_timestamp <= to)
      )
      .sort((a, b) => b.transaction_timestamp - a.transaction_timestamp) || [];
  }, [transactions, search, dateFrom, dateTo]);
  const totalPages = Math.ceil(filteredTransactions.length / PAGE_SIZE);
  const paginatedTransactions = filteredTransactions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const exportToCSV = () => {
    const ledgerMap = new Map(ledgerEntries?.map(e => [e.id, e]));
    const supplierMap = new Map(suppliers?.map(s => [s.id, s]));
    const headers = ['Transaction ID', 'Timestamp', 'Supplier', 'Material', 'Weight (kg)', 'Amount (ZAR)', 'EPR Fee (ZAR)', 'EPR Stream'];
    const rows = filteredTransactions.map(t => {
      const ledgerEntry = ledgerMap.get(t.ledger_entry_id);
      const supplier = ledgerEntry ? supplierMap.get(ledgerEntry.supplier_id) : undefined;
      const materialType = ledgerEntry?.material_type || 'N/A';
      return [
        t.id,
        format(new Date(t.transaction_timestamp), 'yyyy-MM-dd HH:mm:ss'),
        `"${supplier?.name || 'N/A'}"`,
        `"${materialType}"`,
        ledgerEntry?.weight_kg.toFixed(2) || 'N/A',
        t.amount.toFixed(2),
        t.epr_fee.toFixed(2),
        getEprStream(materialType)
      ].join(',');
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "transactions_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  return (
    <PageLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <Button onClick={exportToCSV} disabled={!filteredTransactions || filteredTransactions.length === 0} className="w-full sm:w-auto h-14"><Download className="mr-2 h-4 w-4" /> Export CSV</Button>
        </div>
        <Card>
          <CardHeader>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full md:flex">
              <Input placeholder="Search by ID..." value={search} onChange={e => setSearch(e.target.value)} className="sm:max-w-xs h-14" />
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full sm:w-auto h-14" />
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full sm:w-auto h-14" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto border rounded-lg">
              <Table className="min-w-[600px]">
                <TableHeader><TableRow><TableHead>Transaction ID</TableHead><TableHead>Ledger Entry ID</TableHead><TableHead>Timestamp</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">EPR Fee</TableHead></TableRow></TableHeader>
                <TableBody>
                  {isLoadingTransactions ? (Array.from({ length: 5 }).map((_, i) => (<TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>)))
                   : paginatedTransactions.length > 0 ? (paginatedTransactions.map(t => (
                      <TableRow key={t.id}>
                        <TableCell className="font-mono text-xs truncate">{t.id}</TableCell>
                        <TableCell className="font-mono text-xs truncate">{t.ledger_entry_id}</TableCell>
                        <TableCell>{format(new Date(t.transaction_timestamp), 'PPpp')}</TableCell>
                        <TableCell className="text-right font-mono">{t.amount.toFixed(2)} {t.currency}</TableCell>
                        <TableCell className="text-right font-mono">{t.epr_fee.toFixed(2)}</TableCell>
                      </TableRow>
                    )))
                   : (<TableRow><TableCell colSpan={5} className="text-center h-24">No transactions found.</TableCell></TableRow>)}
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