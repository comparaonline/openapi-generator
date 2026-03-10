/* eslint-disable @typescript-eslint/consistent-type-assertions */
/* eslint-disable @typescript-eslint/no-misused-promises */
import express, { Router } from 'express'
import request from 'supertest'
import { swaggerConfig } from './swaggerConfig'
import joi from 'joi'
import { z } from 'zod'
import { unlinkSync } from 'fs'
import { TestingEntity } from './testing-mocks/testing-entity'
import { OpenApiGenerator } from '../OpenApiGenerator'
import { createHandler, runSwagger, setupOpenApi } from '..'

const init = (): { router: express.Router, app: express.Application } => {
  const router = Router()
  const app = express()
  return { router, app }
}

const schemaVariants = [
  {
    label: 'Joi',
    pathParams: (required = false) => joi.object().required().keys({
      params: { name: required ? joi.string().required() : joi.string() }
    }),
    queryParams: (required = false) => joi.object().required().keys({
      query: { name: required ? joi.string().required() : joi.string() }
    }),
    bodyAndParams: () => joi.object().required().keys({
      params: { name: joi.string() },
      body: { name: joi.string() }
    }),
    bodyParamsAndQuery: (queryRequired = false) => joi.object().required().keys({
      params: { name: joi.string() },
      body: { name: joi.string() },
      query: { search: queryRequired ? joi.number().required() : joi.number() }
    }),
    bodyParamsAndExample: () => joi.object().required().keys({
      params: { name: joi.string() },
      body: { name: joi.string() }
    }).example({
      params: { name: 'testing' },
      body: { name: 'bodyName' }
    }),
    complexBody: () => joi.object().required().keys({
      params: { name: joi.string() },
      body: {
        code: joi.alternatives(joi.string(), joi.number()),
        name: joi.string().when('type', {
          is: joi.string(),
          then: joi.required(),
          otherwise: joi.optional()
        })
      }
    })
  },
  {
    label: 'Zod',
    pathParams: (required = false) => z.object({
      params: z.object({ name: required ? z.string() : z.string().optional() })
    }),
    queryParams: (required = false) => z.object({
      query: z.object({ name: required ? z.string() : z.string().optional() })
    }),
    bodyAndParams: () => z.object({
      params: z.object({ name: z.string().optional() }),
      body: z.object({ name: z.string().optional() })
    }),
    bodyParamsAndQuery: (queryRequired = false) => z.object({
      params: z.object({ name: z.string().optional() }),
      body: z.object({ name: z.string().optional() }),
      query: z.object({ search: queryRequired ? z.number() : z.number().optional() })
    }),
    bodyParamsAndExample: () => z.object({
      params: z.object({ name: z.string().optional() }),
      body: z.object({ name: z.string().optional() })
    }),
    complexBody: () => z.object({
      params: z.object({ name: z.string().optional() }),
      body: z.object({
        code: z.union([z.string(), z.number()]),
        name: z.string().optional()
      })
    })
  }
]

const originalJsonPath = swaggerConfig.jsonPath
const originalBasePath = swaggerConfig.swaggerDoc.basePath

describe('functions (schema-agnostic)', () => {
  beforeEach(() => {
    try {
      setupOpenApi(swaggerConfig)
      unlinkSync(swaggerConfig.jsonPath)
    } catch (error) {
      console.log(error)
    }
  })

  afterEach(() => {
    // Reset any mutations to shared config object before parameterized tests run
    swaggerConfig.jsonPath = originalJsonPath
    swaggerConfig.swaggerDoc.basePath = originalBasePath
    try {
      unlinkSync(swaggerConfig.jsonPath)
    } catch (error) {
      console.log(error)
    }
  })

  it('runSwagger with test endpoint', async () => {
    const { router, app } = init()
    const testRouter = Router()
    testRouter.get('/', (_req, res) => {
      res.status(200).send('OK')
    })
    router.use('/test', testRouter)
    app.use('', router)
    runSwagger(app, router)
    const response = await request(app).get(`${swaggerConfig.endpoint}.json`)
    const swaggerJSON = response.body
    expect(swaggerJSON?.paths?.['/test/']?.get).not.toBeUndefined()
  })

  it('runSwagger with test endpoint without basePath', async () => {
    const path: any = undefined
    OpenApiGenerator.swaggerConfig.swaggerDoc.basePath = path
    const { router, app } = init()
    const testRouter = Router()
    testRouter.get('/', (_req, res) => {
      res.status(200).send('OK')
    })
    router.use('/test', testRouter)
    app.use('', router)
    runSwagger(app, router)
    const response = await request(app).get(`${swaggerConfig.endpoint}.json`)
    const swaggerJSON = response.body
    expect(swaggerJSON?.paths?.['/test/']?.get).not.toBeUndefined()
  })

  it('runSwagger with test endpoint with empty basePath', async () => {
    const path = ''
    OpenApiGenerator.swaggerConfig.swaggerDoc.basePath = path
    const { router, app } = init()
    const testRouter = Router()
    testRouter.get('/', (_req, res) => {
      res.status(200).send('OK')
    })
    router.use('/test', testRouter)
    app.use('', router)
    runSwagger(app, router)
    const response = await request(app).get(`${swaggerConfig.endpoint}.json`)
    const swaggerJSON = response.body
    expect(swaggerJSON?.paths?.['/test/']?.get).not.toBeUndefined()
  })

  it('runSwagger error folder', async () => {
    const { router, app } = init()
    OpenApiGenerator.swaggerConfig.jsonPath = 'notExist/swagger.json'
    const testRouter = Router()
    testRouter.post('/:name', (_req, res) => {
      res.status(200).send('OK')
    })
    router.use('/test', testRouter)
    app.use('', router)
    const run = runSwagger(app, router)
    expect(run.status).toEqual('ERROR')
  })
})

describe.each(schemaVariants)('functions ($label)', ({ pathParams, queryParams, bodyAndParams, bodyParamsAndQuery, bodyParamsAndExample, complexBody }) => {
  beforeEach(() => {
    try {
      setupOpenApi(swaggerConfig)
      unlinkSync(swaggerConfig.jsonPath)
    } catch (error) {
      console.log(error)
    }
  })

  afterEach(() => {
    try {
      unlinkSync(swaggerConfig.jsonPath)
    } catch (error) {
      console.log(error)
    }
  })

  it('runSwagger with test endpoint params', async () => {
    const { router, app } = init()
    const testRouter = Router()
    const handler = createHandler(pathParams())
    testRouter.get('/:name', handler, (_req, res) => {
      res.status(200).send('OK')
    })
    router.use('/test', testRouter)
    app.use('', router)
    runSwagger(app, router)
    const response = await request(app).get(`${swaggerConfig.endpoint}.json`)
    const swaggerJSON = response.body
    const swaggerPath = swaggerJSON?.paths?.['/test/{name}']?.get
    expect(swaggerPath).not.toBeUndefined()
    expect(swaggerPath.parameters.find((param: { in: string, name: string }) => param.name === 'name')?.in).toEqual('path')
  })

  it('runSwagger with test endpoint required params', async () => {
    const { router, app } = init()
    const testRouter = Router()
    const handler = createHandler(pathParams(true))
    testRouter.get('/:name', handler, (_req, res) => {
      res.status(200).send('OK')
    })
    router.use('/test', testRouter)
    app.use('', router)
    runSwagger(app, router)
    const response = await request(app).get(`${swaggerConfig.endpoint}.json`)
    const swaggerJSON = response.body
    const swaggerPath = swaggerJSON?.paths?.['/test/{name}']?.get
    expect(swaggerPath).not.toBeUndefined()
    expect(swaggerPath.parameters.find((param: { in: string, name: string }) => param.name === 'name')?.in).toEqual('path')
  })

  it('runSwagger with test endpoint required query params', async () => {
    const { router, app } = init()
    const testRouter = Router()
    const handler = createHandler(queryParams(true))
    testRouter.get('/:name', handler, (_req, res) => {
      res.status(200).send('OK')
    })
    router.use('/test', testRouter)
    app.use('', router)
    runSwagger(app, router)
    const response = await request(app).get(`${swaggerConfig.endpoint}.json`)
    const swaggerJSON = response.body
    const swaggerPath = swaggerJSON?.paths?.['/test/{name}']?.get
    expect(swaggerPath).not.toBeUndefined()
    expect(swaggerPath.parameters.find((param: { in: string, name: string }) => param.name === 'name')?.in).toEqual('query')
  })

  it('runSwagger with test endpoint body and params', async () => {
    const { router, app } = init()
    const testRouter = Router()
    const handler = createHandler(bodyAndParams())
    testRouter.post('/:name', handler, (_req, res) => {
      res.status(200).send('OK')
    })
    router.use('/test', testRouter)
    app.use('', router)
    runSwagger(app, router)
    const response = await request(app).get(`${swaggerConfig.endpoint}.json`)
    const swaggerJSON = response.body
    const swaggerPath = swaggerJSON?.paths?.['/test/{name}']?.post
    expect(swaggerPath).not.toBeUndefined()
    expect(swaggerPath.requestBody?.content?.['application/json']?.schema?.properties?.name?.type).toEqual('string')
  })

  it('runSwagger with test endpoint body, params and query params', async () => {
    const { router, app } = init()
    const testRouter = Router()
    const handler = createHandler(bodyParamsAndQuery())
    testRouter.post('/:name', handler, (_req, res) => {
      res.status(200).send('OK')
    })
    router.use('/test', testRouter)
    app.use('', router)
    runSwagger(app, router)
    const response = await request(app).get(`${swaggerConfig.endpoint}.json`)
    const swaggerJSON = response.body
    const swaggerPath = swaggerJSON?.paths?.['/test/{name}']?.post
    expect(swaggerPath).not.toBeUndefined()
    expect(swaggerPath.parameters.find((param: { in: string, name: string }) => param.name === 'search' && param.in === 'query')).not.toBeUndefined()
    expect(swaggerPath.parameters.find((param: { in: string, name: string }) => param.name === 'name' && param.in === 'path')).not.toBeUndefined()
    expect(swaggerPath.requestBody?.content?.['application/json']?.schema?.properties?.name?.type).toEqual('string')
  })

  it('runSwagger with test endpoint body, params and query params required', async () => {
    const { router, app } = init()
    const testRouter = Router()
    const handler = createHandler(bodyParamsAndQuery(true))
    testRouter.post('/:name', handler, (_req, res) => {
      res.status(200).send('OK')
    })
    router.use('/test', testRouter)
    app.use('', router)
    runSwagger(app, router)
    const response = await request(app).get(`${swaggerConfig.endpoint}.json`)
    const swaggerJSON = response.body
    const swaggerPath = swaggerJSON?.paths?.['/test/{name}']?.post
    expect(swaggerPath).not.toBeUndefined()
    expect(swaggerPath.parameters.find((param: { in: string, name: string }) => param.name === 'search' && param.in === 'query')?.required).toBeTruthy()
    expect(swaggerPath.parameters.find((param: { in: string, name: string }) => param.name === 'name' && param.in === 'path')?.required).toBeFalsy()
    expect(swaggerPath.requestBody?.content?.['application/json']?.schema?.properties?.name?.type).toEqual('string')
  })

  it('runSwagger with test endpoint body, params and example', async () => {
    const { router, app } = init()
    const testRouter = Router()
    const handler = createHandler(bodyParamsAndExample())
    testRouter.post('/:name', handler, (_req, res) => {
      res.status(200).send('OK')
    })
    router.use('/test', testRouter)
    app.use('', router)
    runSwagger(app, router)
    const response = await request(app).get(`${swaggerConfig.endpoint}.json`)
    const swaggerJSON = response.body
    const swaggerPath = swaggerJSON?.paths?.['/test/{name}']?.post
    expect(swaggerPath).not.toBeUndefined()
    expect(swaggerPath.requestBody?.content?.['application/json']?.schema?.properties?.name?.type).toEqual('string')
  })

  it('runSwagger with test endpoint body force oneOf line', async () => {
    const { router, app } = init()
    const testRouter = Router()
    const handler = createHandler(complexBody())
    testRouter.post('/:name', handler, (_req, res) => {
      res.status(200).send('OK')
    })
    router.use('/test', testRouter)
    app.use('', router)
    runSwagger(app, router)
    const response = await request(app).get(`${swaggerConfig.endpoint}.json`)
    const swaggerJSON = response.body
    const swaggerPath = swaggerJSON?.paths?.['/test/{name}']?.post
    expect(swaggerPath).not.toBeUndefined()
    expect(swaggerPath.requestBody?.content?.['application/json']?.schema?.properties?.name?.type).toEqual('string')
  })

  it('runSwagger with test endpoint and response', async () => {
    const { router, app } = init()
    const testRouter = Router()
    const params = {
      schema: complexBody(),
      contentType: undefined,
      responseType: {
        type: TestingEntity,
        statusCode: 200,
        description: undefined,
        array: false
      },
      description: undefined,
      operationId: undefined
    }
    const handler = createHandler(params)
    testRouter.post('/:name', handler, (_req, res) => {
      res.status(200).send('OK')
    })
    router.use('/test', testRouter)
    app.use('', router)
    runSwagger(app, router)
    const response = await request(app).get(`${swaggerConfig.endpoint}.json`)
    const swaggerJSON = response.body
    const swaggerPath = swaggerJSON?.paths?.['/test/{name}']?.post
    expect(swaggerPath).not.toBeUndefined()
    expect(swaggerPath.requestBody?.content?.['application/json']?.schema?.properties?.name?.type).toEqual('string')
    expect(swaggerPath?.responses?.['200']?.content?.['application/json']?.schema?.$ref?.includes(params.responseType.type.name)).toBeTruthy()
  })

  it('runSwagger with test endpoint and array response', async () => {
    const { router, app } = init()
    const testRouter = Router()
    const params = {
      schema: complexBody(),
      contentType: undefined,
      responseType: {
        type: TestingEntity,
        statusCode: 200,
        description: undefined,
        array: true
      },
      description: undefined,
      operationId: undefined
    }
    const handler = createHandler(params)
    testRouter.post('/:name', handler, (_req, res) => {
      res.status(200).send('OK')
    })
    router.use('/test', testRouter)
    app.use('', router)
    runSwagger(app, router)
    const response = await request(app).get(`${swaggerConfig.endpoint}.json`)
    const swaggerJSON = response.body
    const swaggerPath = swaggerJSON?.paths?.['/test/{name}']?.post
    expect(swaggerPath).not.toBeUndefined()
    expect(swaggerPath.requestBody?.content?.['application/json']?.schema?.properties?.name?.type).toEqual('string')
    expect(swaggerPath?.responses?.['200']?.content?.['application/json']?.schema?.type).toEqual('array')
    expect(swaggerPath?.responses?.['200']?.content?.['application/json']?.schema?.items?.$ref?.includes(params.responseType.type.name)).toBeTruthy()
  })

  it('runSwagger with test endpoint and response description', async () => {
    const { router, app } = init()
    const testRouter = Router()
    const params = {
      schema: complexBody(),
      contentType: 'application/json',
      responseType: {
        type: TestingEntity,
        statusCode: 200,
        description: 'Testing description',
        array: false
      },
      description: undefined,
      operationId: undefined
    }
    const handler = createHandler(params)
    testRouter.post('/:name', handler, (_req, res) => {
      res.status(200).send('OK')
    })
    router.use('/test', testRouter)
    app.use('', router)
    runSwagger(app, router)
    const response = await request(app).get(`${swaggerConfig.endpoint}.json`)
    const swaggerJSON = response.body
    const swaggerPath = swaggerJSON?.paths?.['/test/{name}']?.post
    expect(swaggerPath).not.toBeUndefined()
    expect(swaggerPath.requestBody?.content?.['application/json']?.schema?.properties?.name?.type).toEqual('string')
    expect(swaggerPath?.responses?.['200']?.content?.['application/json']?.schema?.$ref?.includes(params.responseType.type.name)).toBeTruthy()
    expect(swaggerPath?.responses?.['200']?.description).toEqual(params.responseType.description)
  })

  it('runSwagger with test endpoint, response description and operationId', async () => {
    const { router, app } = init()
    const testRouter = Router()
    const params = {
      schema: complexBody(),
      contentType: 'application/json',
      responseType: {
        type: TestingEntity,
        statusCode: 200,
        description: 'Testing description',
        array: false
      },
      description: 'Description',
      operationId: 'testingID'
    }
    const handler = createHandler(params)
    testRouter.post('/:name', handler, (_req, res) => {
      res.status(200).send('OK')
    })
    router.use('/test', testRouter)
    app.use('', router)
    runSwagger(app, router)
    const response = await request(app).get(`${swaggerConfig.endpoint}.json`)
    const swaggerJSON = response.body
    const swaggerPath = swaggerJSON?.paths?.['/test/{name}']?.post
    expect(swaggerPath).not.toBeUndefined()
    expect(swaggerPath.operationId).toEqual(params.operationId)
    expect(swaggerPath.description).toEqual(params.description)
  })
})
