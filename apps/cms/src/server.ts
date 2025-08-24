import express from 'express'
import payload from 'payload'
import 'dotenv/config'

const app = express()

// Redirect root to Admin panel
app.get('/', (_, res) => {
  res.redirect('/cms')
})

const start = async () => {
  // Initialize Payload
  await payload.init({
    secret: process.env.PAYLOAD_SECRET || 'super-secret-fallback-key',
    express: app,
    onInit: async () => {
      payload.logger.info(`Payload Admin URL: ${payload.getAdminURL()}`)
    },
  })

  // Add your own express routes here

  app.listen(process.env.PORT || 9003, () => {
    payload.logger.info(`CMS server started on port ${process.env.PORT || 9003}`)
  })
}

start()
