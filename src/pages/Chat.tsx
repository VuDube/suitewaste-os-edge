import { useState } from 'react';
import { PageLayout } from '@/components/PageLayout';
import { useAuthStore } from '@/stores/useAuthStore';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShieldAlert, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
const mockMessages = [
  { id: 1, user: 'Admin', text: 'Welcome to the team chat! This is a mock interface for now.', timestamp: '10:30 AM', avatar: 'https://github.com/shadcn.png' },
  { id: 2, user: 'You', text: 'Got it. Looks great!', timestamp: '10:31 AM', isSender: true },
  { id: 3, user: 'Manager', text: 'Remember to log all high-value materials with photos.', timestamp: '10:32 AM', avatar: 'https://github.com/vercel.png' },
];
export function Chat() {
  const user = useAuthStore(s => s.user);
  const [message, setMessage] = useState('');
  const hasChatAccess = user?.features?.includes('chat-access');
  if (!hasChatAccess) {
    return (
      <PageLayout>
        <Alert variant="destructive" className="max-w-2xl mx-auto">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>You do not have permission to access the chat feature. Please contact an administrator.</AlertDescription>
        </Alert>
      </PageLayout>
    );
  }
  const handleSend = () => {
    if (message.trim()) {
      console.log('Sending message (mock):', message);
      // In a real app, this would send to a WebSocket and update via offline store
      setMessage('');
    }
  };
  return (
    <PageLayout>
      <div className="h-[calc(100dvh-10rem)] md:h-[calc(100dvh-8rem)] flex flex-col max-w-4xl mx-auto border rounded-lg shadow-lg">
        <header className="p-4 border-b">
          <h1 className="text-xl font-bold">Team Chat</h1>
        </header>
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {mockMessages.map((msg) => (
              <div key={msg.id} className={cn("flex items-end gap-2", msg.isSender ? "justify-end" : "justify-start")}>
                {!msg.isSender && (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={msg.avatar} />
                    <AvatarFallback>{msg.user.charAt(0)}</AvatarFallback>
                  </Avatar>
                )}
                <div className={cn("max-w-xs md:max-w-md p-3 rounded-lg", msg.isSender ? "bg-primary text-primary-foreground" : "bg-muted")}>
                  <p className="text-sm">{msg.text}</p>
                  <p className="text-xs text-right mt-1 opacity-70">{msg.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        <footer className="p-4 border-t bg-background">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="h-12"
            />
            <Button onClick={handleSend} size="icon" className="h-12 w-12 flex-shrink-0">
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </footer>
      </div>
    </PageLayout>
  );
}