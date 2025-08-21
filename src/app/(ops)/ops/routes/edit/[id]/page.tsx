
import { db } from "@/lib/server/db";
import { routes } from "@/lib/server/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { RouteForm } from "../route-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";


export default async function EditRoutePage({ params }: { params: { id: string } }) {
  const isNew = params.id === 'new';
  let routeData = null;

  if (!isNew) {
    routeData = await db.query.routes.findFirst({
      where: eq(routes.id, params.id),
    });
    if (!routeData) {
      notFound();
    }
  }

  return (
    <div className="p-4 md:p-8">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
             <Button variant="outline" size="icon" asChild>
                <Link href="/ops/routes"><ArrowLeft/></Link>
             </Button>
             <div>
                <CardTitle>{isNew ? 'Создание нового маршрута' : 'Редактирование маршрута'}</CardTitle>
                <CardDescription>
                  {isNew ? 'Заполните детали для добавления нового маршрута в каталог.' : `Вы редактируете маршрут "${routeData?.title?.ru || '...'}".`}
                </CardDescription>
             </div>
          </div>
        </CardHeader>
        <CardContent>
            <RouteForm route={routeData} />
        </CardContent>
      </Card>
    </div>
  );
}
