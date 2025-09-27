import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, MessageCircle, Clock } from "lucide-react";
import { useState } from "react";

interface SessionControlsProps {
  sessionData?: {
    message_count: number;
    started_at: string;
    status: 'active' | 'completed' | 'archived';
  };
  onStartFresh: () => Promise<boolean>;
  disabled?: boolean;
}

export const SessionControls = ({ sessionData, onStartFresh, disabled = false }: SessionControlsProps) => {
  const [isStartingFresh, setIsStartingFresh] = useState(false);

  const handleStartFresh = async () => {
    setIsStartingFresh(true);
    try {
      await onStartFresh();
    } finally {
      setIsStartingFresh(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex items-center gap-2">
      {sessionData && (
        <>
          {sessionData.message_count > 0 && (
            <Badge variant="secondary" className="text-xs">
              <MessageCircle className="h-3 w-3 mr-1" />
              {sessionData.message_count} messages
            </Badge>
          )}
          
          <Badge variant="outline" className="text-xs">
            <Clock className="h-3 w-3 mr-1" />
            Started {formatDate(sessionData.started_at)}
          </Badge>
          
          {sessionData.message_count > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleStartFresh}
              disabled={disabled || isStartingFresh}
              className="text-xs h-7"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isStartingFresh ? 'animate-spin' : ''}`} />
              {isStartingFresh ? 'Starting...' : 'Start Fresh'}
            </Button>
          )}
        </>
      )}
    </div>
  );
};