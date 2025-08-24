
# Архитектура (в 5 деталях)

1. **Модель данных (PostgreSQL, JSONB)**

* `cms_page` — текущая рабочая версия (draft/published snapshot).
* `cms_page_revision` — история версий (для отката/аудита).
* `cms_asset` — инвентарь медиа (метаданные, ссылки на S3).

2. **Блоки как данные**

* Каждый блок — **тип + payload** (валидируем Zod).
* На фронте реестр «тип блока → React-компонент (просмотр) + форма (редактор)».

3. **Рендер**

* Публичный рендер в **Node.js runtime** (RSC).
* `ISR + revalidateTag('page:slug')` после публикации.

4. **Админ-редактор**

* DnD билдер (например, `@dnd-kit/*`), `react-hook-form` + `zod` для форм.
* Превью через **`draftMode()`** (Next.js Preview Mode).

5. **Медиа**

* S3 pre-signed upload (PUT). В блоках хранить **assetId** → вытягивать URL из `cms_asset`.

---

# SQL (DDL, минимум)

```sql
-- страницы
create table cms_page (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  locale text not null default 'ru-RU',
  seo jsonb not null default '{}'::jsonb,          -- {title, description, og:*}
  status text not null default 'draft',            -- draft | published
  blocks jsonb not null default '[]'::jsonb,       -- массив блоков
  version int not null default 1,
  published_at timestamptz,
  updated_by text,
  updated_at timestamptz not null default now()
);

-- ревизии (история)
create table cms_page_revision (
  id bigserial primary key,
  page_id uuid not null references cms_page(id) on delete cascade,
  version int not null,
  status text not null,
  blocks jsonb not null,
  seo jsonb not null,
  title text not null,
  created_at timestamptz not null default now(),
  created_by text
);

-- ассеты (медиа)
create table cms_asset (
  id uuid primary key default gen_random_uuid(),
  bucket text not null,
  key text not null,               -- путь в бакете
  mime text not null,
  size bigint not null,
  width int,
  height int,
  created_at timestamptz not null default now(),
  created_by text
);

create index on cms_page using gin (blocks jsonb_path_ops);
create index on cms_page (slug);
```

---

# Контракт блоков (TypeScript + Zod)

```ts
// src/cms/blocks/types.ts
import { z } from "zod";

export const HeroBlock = z.object({
  type: z.literal("hero"),
  data: z.object({
    title: z.string().min(1),
    subtitle: z.string().optional(),
    assetId: z.string().uuid().optional(), // фон/картинка
    cta: z.object({
      label: z.string().min(1),
      href: z.string().url()
    }).optional()
  })
});

export const FeaturesBlock = z.object({
  type: z.literal("features"),
  data: z.object({
    items: z.array(z.object({
      icon: z.string().optional(), // имя иконки/assetId
      title: z.string().min(1),
      text: z.string().min(1)
    })).min(1)
  })
});

export const Block = z.discriminatedUnion("type", [HeroBlock, FeaturesBlock]);
export type Block = z.infer<typeof Block>;
export const PageSchema = z.object({
  slug: z.string(),
  title: z.string(),
  seo: z.record(z.any()).optional(),
  blocks: z.array(Block)
});
```

---

# Рендер страницы (App Router, Node.js runtime)

```tsx
// app/[[...slug]]/page.tsx
export const runtime = 'nodejs'; // важен для pg/drizzle
export const revalidate = 60;    // базовая ISR (плюс tag-рефреш)

import { cache, unstable_cache, unstable_noStore } from "next/cache";
import { Block, PageSchema } from "@/cms/blocks/types";
import { getPageBySlug } from "@/cms/data/pages";
import { components } from "@/cms/blocks/registry";
import { draftMode } from "next/headers";

export default async function Page({ params }: { params: { slug?: string[] } }) {
  const slug = "/" + (params.slug?.join("/") ?? "");
  const { isEnabled: preview } = draftMode();

  // тянем драфт при preview, иначе — опубликованную
  const page = await getPageBySlug(slug, { preview });

  const parsed = PageSchema.safeParse(page);
  if (!parsed.success) {
    // логируй ошибку схемы, отдай 500/empty-state
    throw new Error("Invalid page schema");
  }

  return (
    <main>
      {parsed.data.blocks.map((b: Block, i: number) => {
        const C = components[b.type];
        return <C key={i} {...b.data} />;
      })}
    </main>
  );
}
```

**`components` реестр (просмотр):**

```ts
// src/cms/blocks/registry.tsx
import { Hero } from "@/cms/blocks/view/Hero";
import { Features } from "@/cms/blocks/view/Features";

export const components = {
  hero: Hero,
  features: Features,
} as const;
```

---

# Админ-редактор (каркас)

* **DnD**: `@dnd-kit/core` для сортировки блоков.
* **Формы**: `react-hook-form` + `@hookform/resolvers/zod`.
* **Превью**: кнопка «Предпросмотр» → `/api/preview?token=…&slug=/about-us`, где устанавливаем preview-cookie.

```tsx
// app/ops/pages/[id]/editor/page.tsx (упрощенно)
"use client";
export default function Editor() {
  // 1) тянем draft из API
  // 2) DnD список блоков
  // 3) панель «Добавить блок» (Hero, Features, ...)
  // 4) форма выбранного блока (zod-resolver)
  // 5) autosave (debounce 800ms) -> PUT /api/cms/page/:id
  // 6) Publish -> POST /api/cms/page/:id/publish (создаёт revision + revalidateTag)
  return null;
}
```

**Публикация и сброс кэша**

```ts
// app/api/cms/page/[id]/publish/route.ts
import { revalidateTag } from "next/cache";

export const runtime = 'nodejs';
export async function POST(req: Request, { params }: { params: { id: string }}) {
  // 1) в транзакции: повысить version, скопировать в revision, проставить published_at/status
  // 2) revalidateTag(`page:${slug}`);
  revalidateTag(`page:${/* slug */""}`);
  return Response.json({ ok: true });
}
```

*В fetch слоёк оберни страницу в `unstable_cache(..., { tags: ['page:/about-us'] })`, чтобы `revalidateTag` работал точечно.*

---

# Загрузка в S3 (pre-signed PUT)

```ts
// app/api/upload/route.ts
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
export const runtime = 'nodejs';

export async function POST(req: Request) {
  const { mime, key } = await req.json();
  const s3 = new S3Client({ region: process.env.AWS_REGION });
  const url = await getSignedUrl(s3, new PutObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: key, ContentType: mime, ACL: "public-read" // если нужно
  }), { expiresIn: 300 });

  // запиши черновой cms_asset; после успешной заливки — финализируй
  return Response.json({ url });
}
```

---

# Роли и безопасность

* **Роли**: `viewer` (читает), `editor` (правит черновик), `publisher` (публикует), `admin` (всё).
* **Гранулярные права**: кто может публиковать/удалять/откатывать.
* **Preview Mode** — только с подписанным токеном (одноразовый или TTL).
* **Edge-запреты**: никакого `pg/ioredis` в `middleware`; база — только в Node-роутах/серверных компонентов.

---

# UX практики редактора

* **Ограниченный набор блоков** (8–12 универсальных), каждый с чёткой целью.
* **Пустые состояния**: шаблоны страниц/секции «Добавить первый блок».
* **Автосейв + индикатор** («Сохранено 12:04»), история ревизий с diff по JSON.
* **Оптимистичные операции** (перетаскивание/удаление блока) с Undo.
* **Валидация до публикации** (Zod): заголовки обязательны, ссылки валидны, размеры картинок адекватны.

---

# Запреты

* ❌ Хранить произвольный HTML/JS в блоках (XSS, неконсистентность).
* ❌ Дать редактору «CSS-класс» на произвол — только семантические опции (variant/size/layout).
* ❌ Рендерить драфты на публичном маршруте без Preview Mode.
* ❌ Привязывать блоки к «кодовым» ID компонентов — используем стабильные `type`.

---

# Быстрый старт (MVP–порядок работ, 1–2 дня)

1. Таблицы `cms_page`, `cms_page_revision`, `cms_asset` (SQL выше).
2. Zod-схемы блоков + реестр просмотра.
3. Публичный рендер `app/[[...slug]]/page.tsx` + ISR/tag-кэш.
4. Admin: список страниц, редактор с DnD для 2 блоков (Hero, Features).
5. Upload API (pre-signed) + запись `cms_asset`.
6. Preview Mode + Publish API (revalidateTag).
