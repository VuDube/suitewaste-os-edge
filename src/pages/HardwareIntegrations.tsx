import { useState } from 'react';
import { PageLayout } from '@/components/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSerialScale } from '@/hooks/useSerialScale';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { Cable, Camera, CheckCircle, CircleDashed, Loader2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
export function HardwareIntegrations() {
  const { weight, status, connect, disconnect } = useSerialScale();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isFetchingImage, setIsFetchingImage] = useState(false);
  const handleSnapshot = async () => {
    setIsFetchingImage(true);
    setImageUrl(null);
    try {
      const res = await api<{ imageUrl: string }>('/api/camera/snapshot');
      setImageUrl(res.imageUrl);
      toast.success("Snapshot captured!");
    } catch (error) {
      toast.error("Failed to capture snapshot", { description: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setIsFetchingImage(false);
    }
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
      <div className="space-y-8">
        <h1 className="text-3xl font-bold tracking-tight">Hardware Integrations</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Serial Scale</CardTitle>
              <div className="flex items-center gap-2 text-sm capitalize text-muted-foreground">
                {statusIndicator[status]}
                {status}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center p-8 bg-muted rounded-lg">
                <span className={cn("text-[clamp(4rem,16vw,8rem)] font-mono font-bold", status === 'connected' || status === 'parsing' ? 'text-foreground' : 'text-muted-foreground')}>
                  {weight.toFixed(2)} kg
                </span>
              </div>
              <div className="grid grid-cols-1 md:flex gap-4">
                <Button onClick={connect} disabled={status === 'connected' || status === 'connecting'} className="flex-1 h-14">
                  <Cable className="mr-2 h-4 w-4" /> Connect
                </Button>
                <Button onClick={disconnect} disabled={status === 'disconnected'} variant="destructive" className="flex-1 h-14">
                  <XCircle className="mr-2 h-4 w-4" /> Disconnect
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>IP Camera</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center min-h-64 md:min-h-80">
                {isFetchingImage ? (
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                ) : imageUrl ? (
                  <img src={imageUrl} alt="Camera Snapshot" className="rounded-lg object-cover w-full h-full" />
                ) : (
                  <Camera className="h-12 w-12 text-muted-foreground" />
                )}
              </div>
              <Button onClick={handleSnapshot} disabled={isFetchingImage} className="w-full h-14">
                {isFetchingImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
                Take Snapshot
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}