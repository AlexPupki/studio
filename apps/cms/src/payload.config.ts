import { buildConfig } from 'payload/config'
import path from 'path'
import { slateEditor } from '@payloadcms/richtext-slate'
import { postgresAdapter } from '@payloadcms/db-postgres'

import { Examples } from './collections/Examples'

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
      connectionString: process.env.PG_HOST, // Use the same DB as Next.js app
    },
  }),
})
