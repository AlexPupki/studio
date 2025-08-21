import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container mx-auto text-center p-8">
      <h2 className="text-2xl font-bold mb-4">Маршрут не найден</h2>
      <p className="mb-4">К сожалению, мы не смогли найти запрашиваемый вами маршрут.</p>
      <Button asChild>
        <Link href="/routes">Вернуться ко всем маршрутам</Link>
      </Button>
    </div>
  )
}
