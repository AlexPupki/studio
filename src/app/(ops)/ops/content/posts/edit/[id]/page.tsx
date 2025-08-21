
import { db } from "@/lib/server/db";
import { posts } from "@/lib/server/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { PostForm } from "../post-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";


export default async function EditPostPage({ params }: { params: { id: string } }) {
  const isNew = params.id === 'new';
  let postData = null;

  if (!isNew) {
    postData = await db.query.posts.findFirst({
      where: eq(posts.id, params.id),
    });
    if (!postData) {
      notFound();
    }
  }

  const categories = await db.query.categories.findMany();

  return (
    <div className="p-4 md:p-8">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
             <Button variant="outline" size="icon" asChild>
                <Link href="/ops/content/posts"><ArrowLeft/></Link>
             </Button>
             <div>
                <CardTitle>{isNew ? 'Создание нового поста' : 'Редактирование поста'}</CardTitle>
                <CardDescription>
                  {isNew ? 'Заполните детали для добавления нового поста в блог.' : `Вы редактируете пост "${postData?.title || '...'}"`}
                </CardDescription>
             </div>
          </div>
        </CardHeader>
        <CardContent>
            <PostForm post={postData} categories={categories} />
        </CardContent>
      </Card>
    </div>
  );
}
