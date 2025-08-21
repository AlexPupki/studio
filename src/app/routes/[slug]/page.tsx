import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { db } from "@/lib/server/db";
import { routes } from "@/lib/server/db/schema";
import { eq } from "drizzle-orm";
import { Clock, Users } from "lucide-react";
import type { Metadata, ResolvingMetadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

type Props = {
  params: { slug: string }
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const route = await db.query.routes.findFirst({
    where: eq(routes.slug, params.slug),
  });

  if (!route) {
    return {
      title: 'Маршрут не найден'
    }
  }
 
  // optionally access and extend (rather than replace) parent metadata
  const previousImages = (await parent).openGraph?.images || []
 
  return {
    title: `${route.title.ru} | Grand Tour Sochi`,
    description: route.description?.ru,
    openGraph: {
      title: route.title.ru,
      description: route.description?.ru,
      images: [route.gallery?.[0] || '', ...previousImages],
    },
  }
}

export default async function RouteDetailPage({ params }: Props) {
    const route = await db.query.routes.findFirst({
        where: eq(routes.slug, params.slug),
    });

    if (!route || route.status !== 'active') {
        notFound();
    }

    return (
        <div className="container mx-auto p-4 md:p-8">
            <article className="space-y-8">
                <div className="space-y-4 text-center">
                    <h1 className="text-4xl font-bold font-heading">{route.title.ru}</h1>
                    <p className="text-xl text-muted-foreground max-w-3xl mx-auto">{route.description?.ru}</p>
                </div>
                
                {route.gallery && route.gallery.length > 0 && (
                     <Carousel className="w-full max-w-4xl mx-auto">
                        <CarouselContent>
                            {route.gallery.map((imgUrl, index) => (
                            <CarouselItem key={index}>
                                <div className="p-1">
                                <div className="aspect-video relative">
                                    <Image src={imgUrl} alt={`${route.title.ru} - изображение ${index + 1}`} fill className="object-cover rounded-lg" data-ai-hint="tour landscape" />
                                </div>
                                </div>
                            </CarouselItem>
                            ))}
                        </CarouselContent>
                        <CarouselPrevious />
                        <CarouselNext />
                    </Carousel>
                )}

                <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 py-8">
                    <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
                        <Clock className="w-8 h-8 text-primary"/>
                        <p className="font-semibold">Длительность</p>
                        <p className="text-muted-foreground">{route.durationMinutes} минут</p>
                    </div>
                     <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
                        <p className="text-3xl font-bold text-primary">{new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 }).format(route.basePriceMinor / 100)}</p>
                        <p className="font-semibold">Стоимость</p>
                        <p className="text-muted-foreground">за всю поездку</p>
                    </div>
                     <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
                        <Users className="w-8 h-8 text-primary"/>
                        <p className="font-semibold">Вместимость</p>
                        <p className="text-muted-foreground">до 5 человек</p>
                    </div>
                </div>

                <div className="prose prose-lg max-w-3xl mx-auto">
                    <h2>Подробности маршрута</h2>
                    <p>{route.meetingPoint?.ru || 'Информация о месте встречи будет предоставлена после бронирования.'}</p>
                    {/* Add more detailed description if available */}
                </div>

                <div className="text-center">
                    <Button size="lg">Забронировать сейчас</Button>
                </div>

            </article>
        </div>
    )
}
