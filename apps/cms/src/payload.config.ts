import { buildConfig } from 'payload/config'
import path from 'path'
import { slateEditor } from '@payloadcms/richtext-slate'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { parse } from 'pg-connection-string'

import { Examples } from './collections/Examples'

// Считываем URL базы данных из переменных окружения
const connectionString = process.env.PG_HOST

if (!connectionString) {
  throw new Error('PG_HOST environment variable is not set')
}

// Парсим URL, чтобы извлечь данные для подключения
const dbConfig = parse(connectionString)

export default buildConfig({
  serverURL: process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:9003',
  admin: {
    // For this MVP, we disable auth to make it easy to see the admin panel.
    // In a real app, you would configure a user collection here.
    // user: Users.slug,
  },
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
      // Используем разобранные данные для корректного подключения
      host: dbConfig.host || '',
      port: dbConfig.port ? parseInt(dbConfig.port) : 5432,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database || '',
    },
  }),
})
