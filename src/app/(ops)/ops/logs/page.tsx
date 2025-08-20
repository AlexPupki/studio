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
import { desc } from "drizzle-orm";
import { auditEvents } from "@/lib/server/db/schema";
import Link from "next/link";
import { Button } from "@/components/ui/button";

function getActorBadgeVariant(actorType: string) {
  switch (actorType) {
    case 'system': return 'secondary';
    case 'ops': return 'destructive';
    case 'user': return 'default';
    default: return 'outline';
  }
}

export default async function OpsLogsPage() {
  const events = await db
    .select()
    .from(auditEvents)
    .orderBy(desc(auditEvents.ts))
    .limit(100);

  return (
    <div className="p-4 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Журнал действий</CardTitle>
          <CardDescription>
            Последние 100 событий в системе.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-2">
            <Button variant="outline" asChild>
                <Link href="/ops/dashboard">Бронирования</Link>
            </Button>
            <Button asChild>
                <Link href="/ops/logs">Журнал действий</Link>
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Время</TableHead>
                <TableHead>Субъект</TableHead>
                <TableHead>Действие</TableHead>
                <TableHead>Объект</TableHead>
                <TableHead>ID Объекта</TableHead>
                <TableHead>Trace ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>
                    {event.ts.toLocaleString('ru-RU')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getActorBadgeVariant(event.actorType)}>{event.actorType}</Badge>
                    {event.actorId && <span className="ml-2 text-muted-foreground text-xs">{event.actorId}</span>}
                  </TableCell>
                  <TableCell className="font-medium">{event.action}</TableCell>
                   <TableCell>
                      <Badge variant="outline">{event.entityType}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{event.entityId}</TableCell>
                  <TableCell className="font-mono text-xs">
                     {event.traceId?.substring(0, 8)}...
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
