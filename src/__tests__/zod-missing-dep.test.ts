/* eslint-disable @typescript-eslint/no-misused-promises */
import { unlinkSync } from 'fs'
import express, { Router } from 'express'
import { createHandler, runSwagger, setupOpenApi } from '..'
import { swaggerConfig } from './swaggerConfig'

jest.mock('zod', () => {
  throw Object.assign(
    new Error("Cannot find module 'zod'"),
    { code: 'MODULE_NOT_FOUND' }
  )
})

const fakeZodSchema = {
  safeParse: (data: unknown) => ({ success: true as const, data })
}

const init = (): { router: express.Router, app: express.Application } => {
  const router = Router()
  const app = express()
  return { router, app }
}

describe('Zod - missing zod peer dependency', () => {
  beforeEach(() => {
    setupOpenApi(swaggerConfig)
    try { unlinkSync(swaggerConfig.jsonPath) } catch { /* file may not exist */ }
  })

  afterEach(() => {
    try { unlinkSync(swaggerConfig.jsonPath) } catch { /* file may not exist */ }
  })

  it('returns ERROR with descriptive message when zod is not installed', () => {
    const { router, app } = init()
    const testRouter = Router()
    const handler = createHandler(fakeZodSchema)
    testRouter.post('/', handler, (_req, res) => { res.status(200).send('OK') })
    router.use('/test', testRouter)
    app.use('', router)

    const result = runSwagger(app, router)

    expect(result.status).toBe('ERROR')
    expect((result.error as Error).message).toContain('yarn add zod')
  })
})
