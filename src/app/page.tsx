
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/server/db";
import { routes, type routes as RoutesTable } from "@/lib/server/db/schema";
import { eq } from "drizzle-orm";
import Image from "next/image";
import Link from "next/link";
import { MainLayout } from "@/components/main-layout";


export default async function Home() {

  let featuredRoutes: (typeof RoutesTable.$inferSelect)[] = [];
  try {
    // This query will fail if migrations have not been run.
    // The catch block prevents the page from crashing.
    featuredRoutes = await db.query.routes.findMany({
      where: eq(routes.status, 'active'),
      limit: 3,
    });
  } catch (error) {
    console.error("Database query failed. This may be because migrations have not been run. Error:", error);
    // Gracefully handle the case where the table doesn't exist.
    // The page will render with an empty list of routes.
  }


  return (
    <MainLayout>
        <div className="container mx-auto p-4 md:p-8 space-y-12">
        <div className="text-center space-y-4 py-16">
            <h1 className="text-4xl md:text-6xl font-bold font-heading tracking-tight">Откройте для себя настоящий Сочи</h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            Эксклюзивные туры и незабываемые впечатления. Мы предлагаем лучшие маршруты для вашего отдыха — от полетов на вертолете до гонок на багги.
            </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredRoutes.map(route => (
            <Card key={route.id} className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="p-0">
                {route.gallery?.[0] ? (
                    <div className="aspect-video relative w-full">
                        <Image src={route.gallery[0]} alt={route.title.ru} fill className="object-cover" data-ai-hint="tour image" />
                    </div>
                ): (
                   <div className="aspect-video relative w-full bg-secondary">
                        <Image src="https://placehold.co/600x400.png" alt="Placeholder" fill className="object-cover" data-ai-hint="tour landscape" />
                   </div>
                )}
                </CardHeader>
                <CardContent className="flex-grow p-6 space-y-2">
                    <CardTitle className="text-xl font-heading">{route.title.ru}</CardTitle>
                    <CardDescription>{route.description?.ru.substring(0, 100)}...</CardDescription>
                </CardContent>
                <CardFooter className="p-6 bg-muted/50 flex justify-between items-center">
                    <p className="text-xl font-bold font-heading">{new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 }).format(route.basePriceMinor / 100)}</p>
                    <Button asChild>
                        <Link href={`/routes/${route.slug}`}>Подробнее</Link>
                    </Button>
                </CardFooter>
            </Card>
            ))}
             {featuredRoutes.length === 0 && (
                <div className="col-span-full text-center text-muted-foreground p-8 border rounded-lg">
                    <p>Популярные маршруты скоро появятся здесь.</p>
                </div>
             )}
        </div>

        <div className="text-center py-12">
            <Button asChild size="lg" className="text-lg py-6 px-10">
                <Link href="/routes">Все маршруты</Link>
            </Button>
        </div>
        </div>
    </MainLayout>
  );
}
