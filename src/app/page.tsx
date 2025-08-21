
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/server/db";
import { routes } from "@/lib/server/db/schema";
import { eq } from "drizzle-orm";
import Image from "next/image";
import Link from "next/link";
import { MainLayout } from "@/components/main-layout";


export default async function Home() {

  const featuredRoutes = await db.query.routes.findMany({
    where: eq(routes.status, 'active'),
    limit: 3,
  });

  return (
    <MainLayout>
        <div className="container mx-auto p-4 md:p-8 space-y-8">
        <div className="text-center space-y-4 py-16">
            <h1 className="text-4xl md:text-5xl font-bold font-heading">Откройте для себя настоящий Сочи</h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            Эксклюзивные туры и незабываемые впечатления. Мы предлагаем лучшие маршруты для вашего отдыха — от полетов на вертолете до гонок на багги.
            </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredRoutes.map(route => (
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
                </CardContent>
                <CardFooter>
                <Button asChild className="w-full">
                    <Link href={`/routes/${route.slug}`}>Подробнее</Link>
                </Button>
                </CardFooter>
            </Card>
            ))}
        </div>

        <div className="text-center py-8">
            <Button asChild size="lg">
                <Link href="/routes">Все маршруты</Link>
            </Button>
        </div>
        </div>
    </MainLayout>
  );
}
