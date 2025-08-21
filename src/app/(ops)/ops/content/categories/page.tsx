
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/lib/server/db";
import { categories } from "@/lib/server/db/schema";
import { desc } from "drizzle-orm";
import { Pencil, PlusCircle } from "lucide-react";
import { CategoryDeleteButton, CategoryEditDialog } from "./category-actions";

export default async function OpsCategoriesPage() {
  const allCategories = await db.query.categories.findMany({
    orderBy: [desc(categories.name)],
  });

  return (
    <div className="p-4 md:p-8">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Управление категориями</CardTitle>
              <CardDescription>
                Создавайте и редактируйте категории для постов блога.
              </CardDescription>
            </div>
            <CategoryEditDialog>
               <Button>
                <PlusCircle className="mr-2"/>
                Добавить категорию
               </Button>
            </CategoryEditDialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Слаг</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allCategories.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">
                    Категории еще не созданы.
                  </TableCell>
                </TableRow>
              )}
              {allCategories.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell className="font-medium">{cat.name}</TableCell>
                  <TableCell className="font-mono text-sm">{cat.slug}</TableCell>
                  <TableCell className="text-right">
                    <CategoryEditDialog category={cat}>
                       <Button variant="ghost" size="icon">
                            <Pencil className="h-4 w-4"/>
                        </Button>
                    </CategoryEditDialog>
                    <CategoryDeleteButton categoryId={cat.id} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
