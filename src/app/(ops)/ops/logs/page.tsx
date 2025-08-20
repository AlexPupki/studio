import { db } from "@/lib/server/db";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { desc, gte } from "drizzle-orm";
import { requestLogs } from "@/lib/server/db/schema";
import { subHours } from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";

function getStatusColor(status: number) {
  if (status >= 500) return 'destructive';
  if (status >= 400) return 'secondary';
  return 'default';
}

export default async function OpsLogsPage() {
  const logs = await db
    .select()
    .from(requestLogs)
    .where(gte(requestLogs.ts, subHours(new Date(), 24)))
    .orderBy(desc(requestLogs.ts))
    .limit(100);

  return (
    <div className="p-4 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Логи запросов</CardTitle>
          <CardDescription>
            Запросы к API за последние 24 часа.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Время</TableHead>
                <TableHead>Метод</TableHead>
                <TableHead>Путь</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Длительность</TableHead>
                <TableHead>Trace ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    {log.ts.toLocaleTimeString('ru-RU')}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{log.method}</Badge>
                  </TableCell>
                  <TableCell className="font-mono">{log.path}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(log.status)}>{log.status}</Badge>
                  </TableCell>
                  <TableCell>{log.durationMs}ms</TableCell>
                  <TableCell className="font-mono">
                     <Button variant="link" asChild className="p-0 h-auto font-mono">
                        <Link href={`/ops/logs?traceId=${log.traceId}`}>
                            {log.traceId.substring(0, 8)}...
                        </Link>
                     </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
