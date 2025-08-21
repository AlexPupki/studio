
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export default function OpsContentPage() {
  return (
    <div className="p-4 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Управление контентом</CardTitle>
          <CardDescription>
            Здесь вы можете управлять страницами и записями блога.
          </CardDescription>
        </CardHeader>
        <CardContent>
           <div className="mb-4 flex flex-wrap gap-2">
            <Button variant="secondary" asChild>
              <Link href="/ops/content/posts">Посты</Link>
            </Button>
             <Button variant="outline" asChild>
              <Link href="/ops/content/pages">Страницы</Link>
            </Button>
             <Button variant="outline" asChild>
              <Link href="/ops/content/categories">Категории</Link>
            </Button>
           </div>
          <div className="border rounded-lg p-8 text-center text-muted-foreground">
            <p>Выберите раздел контента для управления.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
