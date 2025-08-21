
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export default function OpsCatalogPage() {
  return (
    <div className="p-4 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Управление каталогом</CardTitle>
          <CardDescription>
            Здесь вы можете управлять услугами, техникой и маршрутами.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/ops/dashboard">Бронирования</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/ops/logs">Журнал действий</Link>
            </Button>
            <Button asChild>
              <Link href="/ops/catalog">Каталог</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/ops/content">Контент</Link>
            </Button>
          </div>
          <div className="border rounded-lg p-8 text-center text-muted-foreground">
            <p>Раздел управления каталогом находится в разработке.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
