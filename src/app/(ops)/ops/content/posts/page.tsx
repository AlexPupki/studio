
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
import { posts } from "@/lib/server/db/schema";
import { desc } from "drizzle-orm";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Pencil } from "lucide-react";

export default async function OpsPostsPage() {
  const allPosts = await db.query.posts.findMany({
    orderBy: [desc(posts.createdAt)],
    with: {
        category: true,
    }
  });

  return (
    <div className="p-4 md:p-8">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Управление постами</CardTitle>
              <CardDescription>
                Здесь вы можете создавать и редактировать посты блога.
              </CardDescription>
            </div>
            <Button asChild>
              <Link href="/ops/content/posts/edit/new">Добавить пост</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Заголовок</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Категория</TableHead>
                <TableHead>Дата публикации</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allPosts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    Посты еще не созданы.
                  </TableCell>
                </TableRow>
              )}
              {allPosts.map((post) => (
                <TableRow key={post.id}>
                  <TableCell className="font-medium">{post.title}</TableCell>
                  <TableCell>
                    <Badge variant={post.status === 'published' ? 'default' : 'secondary'}>
                      {post.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{post.category?.name || 'Без категории'}</TableCell>
                  <TableCell>
                    {post.publishedAt?.toLocaleDateString('ru-RU')}
                  </TableCell>
                  <TableCell>
                     <Button variant="ghost" size="icon" asChild>
                        <Link href={`/ops/content/posts/edit/${post.id}`}>
                            <Pencil className="h-4 w-4"/>
                        </Link>
                    </Button>
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
