import express from 'express'
import cors from 'cors'
import { env } from 'env'
import { calculateSimpleMetric } from './post-calculate-metric'
import { getLLMPromptLabels } from './get-llm-prompt-labels'
import { timePeriodToUnixTimestamp } from './functions/unixify'

export const initServer = () => {
  const app = express()

  app.use(cors())
  app.use(express.json())

  app.get('/health-check', (_, res) => {
    res.sendStatus(200)
  })

  app.post('/calculation', calculateSimpleMetric)

  app.get('/train/labels', getLLMPromptLabels)

  app.get('/functions/unixify', timePeriodToUnixTimestamp)

  // New route added
  app.post('/', (_, res) => {
    res.send('XPtbA9RMYpAfsScL8tfMnuiHzeB8PupF')
  })

  app.use((_req, res, _next) => {
    res.sendStatus(404)
  })

  if (Bun.env.NODE_ENV === 'test') {
    // don't listen if you're running int tests
    // as supertests takes over at this point
    return app
  }

  app.listen(env.server.port, () => {
    console.log(`Listening on port ${env.server.port}`)
  })

  return app
}
