'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import React, { useState, useEffect, useCallback } from 'react';
import { clearLogsAction, getLogsAction } from '@/lib/actions/log.actions';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Trash2, Loader2, Download } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface LogData {
  content: string;
  size: number;
}

export default function OpsLogsPage() {
  const [logs, setLogs] = useState<LogData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const { toast } = useToast();
  const logContainerRef = React.useRef<HTMLDivElement>(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const logData = await getLogsAction();
      setLogs(logData);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Ошибка при загрузке логов',
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    // Scroll to the bottom of the log container when logs are updated
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const handleClearLogs = async () => {
    setIsClearing(true);
    try {
      await clearLogsAction();
      toast({
        title: 'Успешно!',
        description: 'Файл логов был очищен.',
      });
      fetchLogs(); // Refresh logs after clearing
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Ошибка при очистке логов',
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsClearing(false);
    }
  };

  const handleDownload = () => {
    if (logs) {
      const blob = new Blob([logs.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `debug-log-${new Date().toISOString()}.log`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="p-4 md:p-8">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Журнал Приложения (debug.log)</CardTitle>
              <CardDescription>
                Просмотр системных логов. Размер файла: {(logs?.size ?? 0 / 1024).toFixed(2)} KB.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={fetchLogs} variant="outline" size="icon" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
              <Button onClick={handleDownload} variant="outline" size="icon" disabled={!logs?.content}>
                <Download className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="icon" disabled={isClearing}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Это действие нельзя отменить. Файл логов `debug.log` будет полностью очищен.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Отмена</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearLogs} disabled={isClearing}>
                      {isClearing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Очистить
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea
            className="h-[60vh] w-full rounded-md border bg-muted"
            ref={logContainerRef}
          >
            <pre className="p-4 text-xs font-mono whitespace-pre-wrap break-all">
              {isLoading ? 'Загрузка логов...' : logs?.content || 'Файл логов пуст.'}
            </pre>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
