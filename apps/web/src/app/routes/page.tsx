import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import Link from "next/link"

// Dummy data for routes
const routes = [
  {
    slug: 'morskaya-progulka-na-katere',
    title: 'Морская прогулка на катере',
    description: 'Насладитесь видами Сочи с моря на борту комфортабельного катера.',
    image: 'https://placehold.co/600x400.png',
    aiHint: 'yacht sea'
  },
  {
    slug: 'polet-na-vertolete',
    title: 'Полет на вертолете',
    description: 'Незабываемые впечатления и панорамные виды на Кавказские горы.',
    image: 'https://placehold.co/600x400.png',
    aiHint: 'helicopter mountains'
  },
  {
    slug: 'dzhping-v-gory',
    title: 'Джиппинг в горы',
    description: 'Экстремальное приключение по горным рекам и водопадам.',
    image: 'https://placehold.co/600x400.png',
    aiHint: 'jeep mountains'
  },
  {
    slug: 'arenda-gidrocikla',
    title: 'Аренда гидроцикла',
    description: 'Скорость и адреналин на волнах Черного моря.',
    image: 'https://placehold.co/600x400.png',
    aiHint: 'jet ski'
  },
]

export default function RoutesPage() {
  return (
    <div className="bg-background">
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold font-heading tracking-tight text-foreground">
            Наши Туры и Экскурсии
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Выберите приключение по душе и откройте для себя Сочи с новой стороны.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {routes.map((route) => (
            <Link href={`/routes/${route.slug}`} key={route.slug} className="group">
              <Card className="h-full overflow-hidden transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-1">
                <CardContent className="p-0">
                  <img 
                    src={route.image}
                    alt={route.title}
                    data-ai-hint={route.aiHint}
                    className="w-full h-48 object-cover"
                  />
                </CardContent>
                <CardHeader>
                  <CardTitle>{route.title}</CardTitle>
                  <CardDescription className="pt-2">{route.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
