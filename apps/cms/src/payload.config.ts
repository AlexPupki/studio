import { buildConfig } from 'payload/config'
import path from 'path'
import { slateEditor } from '@payloadcms/richtext-slate'
import { postgresAdapter } from '@payloadcms/db-postgres'
import 'dotenv/config'

import { Examples } from './collections/Examples'

if (!process.env.PG_HOST || !process.env.PG_USER || !process.env.PG_DATABASE) {
  throw new Error(
    'Database connection details are not fully set in environment variables.'
  )
}

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
      host: process.env.PG_HOST,
      port: process.env.PG_PORT ? parseInt(process.env.PG_PORT) : 5432,
      user: process.env.PG_USER,
      password: process.env.PG_PASSWORD,
      database: process.env.PG_DATABASE,
    },
  }),
})
