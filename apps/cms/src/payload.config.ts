
import { buildConfig } from 'payload/config'
import path from 'path'
import { slateEditor } from '@payloadcms/richtext-slate'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { Examples } from './collections/Examples'
import 'dotenv/config'

const MOCK_DB = process.env.NODE_ENV === 'test' || !process.env.PG_HOST

export default buildConfig({
  serverURL: process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:9003',
  admin: {
    // For this MVP, we disable auth to make it easy to see the admin panel.
    // In a real app, you would configure a user collection here.
    // user: Users.slug,
  },
  cors: [
    // Разрешаем запросы от нашего веб-приложения
    process.env.APP_BASE_URL || 'http://localhost:9002'
  ],
  csrf: [
    // Добавляем домен в доверенные для CSRF
    process.env.APP_BASE_URL || 'http://localhost:9002'
  ],
  editor: slateEditor({}),
  collections: [Examples],
  typescript: {
    outputFile: path.resolve(__dirname, 'payload-types.ts'),
  },
  graphQL: {
    schemaOutputFile: path.resolve(__dirname, 'generated-schema.graphql'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: MOCK_DB
        ? 'postgres://user:pass@localhost:5432/mockdb'
        : `postgres://${process.env.PG_USER}:${process.env.PG_PASSWORD}@${process.env.PG_HOST}:${process.env.PG_PORT || 5432}/${process.env.PG_DATABASE}`,
    },
  }),
})
