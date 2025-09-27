import { useEffect, useState } from 'react';
import { chatService } from '@/services/chatService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const HealthCheck = () => {
  const [status, setStatus] = useState<'loading' | 'healthy' | 'error'>('loading');
  const [message, setMessage] = useState<string>('Checking connection...');

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await chatService.healthCheck();
        setStatus('healthy');
        setMessage(response.message);
      } catch (error) {
        setStatus('error');
        setMessage(`Failed to connect to FastAPI backend: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    checkHealth();
  }, []);

  const getStatusColor = () => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-yellow-500';
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Backend Connection Status
          <Badge className={getStatusColor()}>
            {status === 'loading' ? 'Checking...' : status}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
};