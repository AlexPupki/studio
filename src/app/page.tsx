import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
      <div className="text-center">
        <h1 className="font-heading text-4xl font-bold tracking-tight text-primary md:text-6xl">
          Grand Tour Sochi
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          Скоро здесь появится сайт с эксклюзивными турами и впечатлениями в Сочи.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Button size="lg">Узнать больше</Button>
        </div>
      </div>
    </main>
  );
}
