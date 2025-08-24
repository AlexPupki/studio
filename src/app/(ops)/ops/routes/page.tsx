
import { Button } from "@/components/ui/button";
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
import { db } from "@/lib/server/db";
import { routes } from "@/lib/server/db/schema";
import { desc } from "drizzle-orm";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Pencil } from "lucide-react";

export default async function OpsRoutesPage() {
  const allRoutes = await db.query.routes.findMany({
    orderBy: [desc(routes.createdAt)],
  });

  return (
    <div className="p-4 md:p-8">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Управление маршрутами</CardTitle>
              <CardDescription>
                Здесь вы можете создавать, редактировать и управлять маршрутами.
              </CardDescription>
            </div>
            <Button asChild>
              <Link href="/ops/routes/edit/new">Добавить маршрут</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Desktop Table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название (RU)</TableHead>
                  <TableHead>Слаг</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Цена</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allRoutes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                      Маршруты еще не созданы.
                    </TableCell>
                  </TableRow>
                )}
                {allRoutes.map((route) => (
                  <TableRow key={route.id}>
                    <TableCell className="font-medium">{route.title.ru}</TableCell>
                    <TableCell className="font-mono">{route.slug}</TableCell>
                    <TableCell>
                      <Badge variant={route.status === 'active' ? 'default' : 'secondary'}>
                        {route.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Intl.NumberFormat('ru-RU', {
                        style: 'currency',
                        currency: 'RUB',
                        minimumFractionDigits: 0,
                      }).format(route.basePriceMinor / 100)}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" asChild>
                          <Link href={`/ops/routes/edit/${route.id}`}>
                              <Pencil className="h-4 w-4"/>
                          </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {/* Mobile Card List */}
          <ul className="md:hidden space-y-4">
              {allRoutes.length === 0 && (
                  <li className="text-center text-muted-foreground py-8">Маршруты еще не созданы.</li>
              )}
              {allRoutes.map((route) => (
                <li key={route.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="font-medium">{route.title.ru}</div>
                      <Button variant="ghost" size="icon" asChild className="shrink-0">
                          <Link href={`/ops/routes/edit/${route.id}`}>
                              <Pencil className="h-4 w-4"/>
                          </Link>
                      </Button>
                  </div>
                   <div className="text-sm text-muted-foreground font-mono">{route.slug}</div>
                  <div className="flex justify-between items-center text-sm">
                     <Badge variant={route.status === 'active' ? 'default' : 'secondary'}>
                        {route.status}
                    </Badge>
                    <span className="font-semibold text-base">{new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 }).format(route.basePriceMinor / 100)}</span>
                  </div>
                </li>
              ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
