import { useState, memo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useSerialScale } from "@/hooks/useSerialScale";
import { useOfflineStore } from "@/stores/useOfflineStore";
import { cn } from "@/lib/utils";
import { Cable, CheckCircle, CircleDashed, Loader2, Send, XCircle, ArrowLeft } from "lucide-react";
import { Toaster, toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Supplier } from "@shared/types";
import { v4 as uuid } from 'uuid';
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { PageLayout } from "@/components/PageLayout";
const WeightDisplay = memo(({ weight, status }: { weight: number, status: string }) => (
  <div className="relative w-full text-center mb-6">
    <span
      className={cn(
        "font-mono font-bold tabular-nums transition-all duration-500",
        "text-[clamp(5rem,20vw,12rem)] sm:text-[clamp(6rem,25vw,14rem)]",
        status === 'connected' || status === 'parsing'
          ? "bg-gradient-to-r from-primary to-emerald-500 bg-clip-text text-transparent animate-pulse"
          : "text-muted-foreground/50"
      )}
    >
      {weight.toFixed(2)}
    </span>
    <span className="absolute bottom-1 right-0 text-2xl md:text-4xl font-medium text-muted-foreground">kg</span>
  </div>
));
export function QuickWeightPOS() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { weight, status, connect } = useSerialScale();
  const addLedgerEntry = useOfflineStore(s => s.addLedgerEntry);
  const addTransaction = useOfflineStore(s => s.addTransaction);
  const syncAllPending = useOfflineStore(s => s.syncAllPending);
  const totalPending = useOfflineStore(s => s.totalPending());
  const [supplierId, setSupplierId] = useState<string>('');
  const [materialType, setMaterialType] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const { data: suppliers, isLoading: isLoadingSuppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => api<Supplier[]>('/api/suppliers'),
    enabled: !!user,
  });
  const handleCapture = () => {
    if (status !== 'connected' && status !== 'parsing') {
      toast.error("Scale not connected.");
      return;
    }
    if (weight <= 0) {
      toast.error("Weight must be greater than zero.");
      return;
    }
    if (!supplierId) {
      toast.error("Please select a supplier.");
      return;
    }
    if (!materialType.trim()) {
      toast.error("Please enter a material type.");
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      toast.error("Please enter a valid amount.");
      return;
    }
    const ledgerEntryId = uuid();
    const eprFee = weight * 0.1; // Mock EPR fee calculation
    addLedgerEntry({
      id: ledgerEntryId,
      supplier_id: supplierId,
      material_type: materialType.trim(),
      weight_kg: weight,
      notes: notes.trim(),
      operator_id: user?.id,
    });
    addTransaction({
      ledger_entry_id: ledgerEntryId,
      amount: parsedAmount,
      epr_fee: eprFee,
      currency: 'ZAR',
    });
    setMaterialType("");
    setAmount("");
    setNotes("");
  };
  const handleSync = () => {
    syncAllPending().then(() => {
      queryClient.invalidateQueries({ queryKey: ['ledger'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    });
  };
  const statusIndicator = {
    disconnected: <XCircle className="h-5 w-5 text-red-500" />,
    connecting: <CircleDashed className="h-5 w-5 text-yellow-500 animate-spin" />,
    connected: <CheckCircle className="h-5 w-5 text-green-500" />,
    parsing: <CheckCircle className="h-5 w-5 text-green-500 animate-pulse" />,
    error: <XCircle className="h-5 w-5 text-red-500" />,
  };
  return (
    <PageLayout>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 overflow-hidden">
        <div className="md:col-span-2 flex flex-col">
          <Card className="bg-card/80 border-border backdrop-blur-xl shadow-glow shadow-primary/40 hover:shadow-primary/60 transition-shadow flex-1 flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-4">
                <Link to="/" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="text-xs font-semibold hidden sm:inline">Dashboard</span>
                </Link>
                <CardTitle className="text-lg font-medium text-muted-foreground">Live Weight</CardTitle>
              </div>
              <div className="flex items-center gap-2 text-sm capitalize text-muted-foreground">
                {statusIndicator[status]}
                {status}
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col items-center justify-center p-6">
              <WeightDisplay weight={weight} status={status} />
              <div className="w-full flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  className="flex-1 bg-gradient-to-r from-primary to-green-600 hover:from-primary hover:to-emerald-600 text-primary-foreground h-14 text-lg font-semibold transition-all duration-200 hover:scale-105 active:scale-95 focus:ring-2 focus:ring-ring shadow-glow-lg shadow-primary/40"
                  onClick={handleCapture}
                  disabled={status !== 'connected' && status !== 'parsing'}
                >
                  Capture Weight & Transaction
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="flex-1 hover:bg-accent h-14 text-lg font-semibold transition-all"
                  onClick={connect}
                  disabled={status === 'connected' || status === 'connecting' || status === 'parsing'}
                >
                  <Cable className="mr-2 h-5 w-5" />
                  Connect Device
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="md:col-span-1">
          <Card className="bg-card/80 border-border backdrop-blur-xl shadow-glow shadow-primary/40 h-full">
            <CardHeader>
              <CardTitle className="text-lg font-medium text-muted-foreground">Transaction Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="supplier" className="text-sm font-medium text-muted-foreground mb-1 block">Supplier</label>
                {isLoadingSuppliers ? <Skeleton className="h-14 w-full" /> : (
                  <Select onValueChange={setSupplierId} value={supplierId || ''}>
                    <SelectTrigger className="bg-input border-border text-foreground placeholder:text-muted-foreground focus:ring-ring h-14">
                      <SelectValue placeholder="Select a supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div>
                <label htmlFor="material" className="text-sm font-medium text-muted-foreground mb-1 block">Material Type</label>
                <Input id="material" placeholder="e.g., Copper Wire" value={materialType} onChange={e => setMaterialType(e.target.value)} className="bg-input border-border text-foreground placeholder:text-muted-foreground focus:ring-ring h-14" />
              </div>
               <div>
                <label htmlFor="amount" className="text-sm font-medium text-muted-foreground mb-1 block">Amount (ZAR)</label>
                <Input id="amount" type="number" placeholder="e.g., 1250.50" value={amount} onChange={e => setAmount(e.target.value)} className="bg-input border-border text-foreground placeholder:text-muted-foreground focus:ring-ring h-14" />
              </div>
              <div>
                <label htmlFor="notes" className="text-sm font-medium text-muted-foreground mb-1 block">Notes</label>
                <Textarea id="notes" placeholder="Optional notes..." value={notes} onChange={e => setNotes(e.target.value)} className="bg-input border-border text-foreground placeholder:text-muted-foreground focus:ring-ring" />
              </div>
              <Button onClick={handleSync} className="w-full h-14 text-lg" disabled={totalPending === 0}>
                <Send className="mr-2 h-4 w-4" />
                Sync Pending
                {totalPending > 0 && <Badge className="ml-2 bg-destructive animate-pulse">{totalPending}</Badge>}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      <Toaster richColors theme="dark" />
    </PageLayout>
  );
}