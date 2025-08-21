
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/server/db";
import { routes } from "@/lib/server/db/schema";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { MainLayout } from "@/components/main-layout";

export const metadata: Metadata = {
    title: 'Все маршруты | Grand Tour Sochi',
    description: 'Ознакомьтесь со всеми нашими эксклюзивными турами и маршрутами в Сочи.',
};

export default async function RoutesPage() {
  const allRoutes = await db.query.routes.findMany({
    where: eq(routes.status, 'active'),
  });

  return (
    <MainLayout>
        <div className="container mx-auto p-4 md:p-8 space-y-8">
        <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold font-heading">Наши маршруты</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Выберите идеальное приключение из нашего каталога эксклюзивных туров.
            </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {allRoutes.map(route => (
            <Card key={route.id} className="flex flex-col">
                <CardHeader>
                {route.gallery?.[0] && (
                    <div className="aspect-video relative w-full overflow-hidden rounded-t-lg">
                        <Image src={route.gallery[0]} alt={route.title.ru} fill className="object-cover" data-ai-hint="tour image" />
                    </div>
                )}
                <CardTitle>{route.title.ru}</CardTitle>
                <CardDescription>{route.description?.ru.substring(0, 100)}...</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                <p className="text-lg font-semibold">{new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 }).format(route.basePriceMinor / 100)}</p>
                <p className="text-sm text-muted-foreground">Длительность: {route.durationMinutes} минут</p>
                </CardContent>
                <CardFooter>
                <Button asChild className="w-full">
                    <Link href={`/routes/${route.slug}`}>Подробнее и забронировать</Link>
                </Button>
                </CardFooter>
            </Card>
            ))}
            {allRoutes.length === 0 && (
                <p className="text-center text-muted-foreground col-span-full">Активные маршруты пока не добавлены.</p>
            )}
        </div>
        </div>
    </MainLayout>
  );
}
