/* eslint-disable @typescript-eslint/no-misused-promises */
import { unlinkSync } from 'fs'
import express, { Router } from 'express'
import { z } from 'zod'
import { createHandler, runSwagger, setupOpenApi } from '..'
import { swaggerConfig } from './swaggerConfig'

jest.mock('@asteasolutions/zod-to-openapi', () => {
  throw Object.assign(
    new Error("Cannot find module '@asteasolutions/zod-to-openapi'"),
    { code: 'MODULE_NOT_FOUND' }
  )
})

const init = (): { router: express.Router, app: express.Application } => {
  const router = Router()
  const app = express()
  return { router, app }
}

describe('Zod - missing @asteasolutions/zod-to-openapi', () => {
  beforeEach(() => {
    setupOpenApi(swaggerConfig)
    try { unlinkSync(swaggerConfig.jsonPath) } catch { /* file may not exist */ }
  })

  afterEach(() => {
    try { unlinkSync(swaggerConfig.jsonPath) } catch { /* file may not exist */ }
  })

  it('returns ERROR with descriptive message when @asteasolutions/zod-to-openapi is not installed', () => {
    const { router, app } = init()
    const testRouter = Router()
    const zodSchema = z.object({ body: z.object({ name: z.string() }) })
    const handler = createHandler(zodSchema)
    testRouter.post('/', handler, (_req, res) => { res.status(200).send('OK') })
    router.use('/test', testRouter)
    app.use('', router)

    const result = runSwagger(app, router)

    expect(result.status).toBe('ERROR')
    expect((result.error as Error).message).toContain(
      'Zod schema support requires "@asteasolutions/zod-to-openapi"'
    )
  })
})
