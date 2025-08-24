import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-slate-100 dark:to-slate-900">
      <div className="container px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold font-heading tracking-tight text-foreground">
            Grand Tour Sochi
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Добро пожаловать в панель управления проектом. Выберите, куда вы хотите перейти.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Link href="/routes" className="group">
            <Card className="h-full transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-1">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Веб-приложение</span>
                  <ArrowRight className="w-5 h-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </CardTitle>
                <CardDescription>
                  Публичный сайт, каталог туров и система бронирования для клиентов.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-slate-200 dark:bg-slate-800 rounded-md flex items-center justify-center">
                  <span className="text-muted-foreground text-sm">Предпросмотр</span>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/cms" className="group" target="_blank" rel="noopener noreferrer">
            <Card className="h-full transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-1">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>CMS (Payload)</span>
                  <ArrowRight className="w-5 h-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </CardTitle>
                <CardDescription>
                  Административная панель для управления контентом: страницы, посты, медиа.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-slate-200 dark:bg-slate-800 rounded-md flex items-center justify-center">
                  <span className="text-muted-foreground text-sm">Админ-панель</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </main>
  );
}
