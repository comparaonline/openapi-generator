/* eslint-disable @typescript-eslint/consistent-type-assertions */
/* eslint-disable @typescript-eslint/no-misused-promises */
import express, { Router } from 'express'
import request from 'supertest'
import { swaggerConfig } from './swaggerConfig'
import joi from 'joi'
import { unlinkSync } from 'fs'
import { TestingEntity } from './testing-mocks/testing-entity'
import { runSwagger, createHandler } from '..'

const init = (): { router: express.Router, app: express.Application } => {
  const router = Router()
  const app = express()
  return { router, app }
}

describe('functions', () => {
  beforeEach(() => {
    try {
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

  it('runSwagger with test endpoint', async () => {
    const { router, app } = init()
    const testRouter = Router()
    testRouter.get('/', (_req, res) => {
      res.status(200).send('OK')
    })
    router.use('/test', testRouter)

    app.use('', router)
    runSwagger(app, router, swaggerConfig)
    const response = await request(app).get(`${swaggerConfig.endpoint}.json`)
    const swaggerJSON = response.body
    expect(swaggerJSON?.paths?.['/test/']?.get).not.toBeUndefined()
  })
  it('runSwagger with test endpoint without basePath', async () => {
    const { router, app } = init()
    const testRouter = Router()
    testRouter.get('/', (_req, res) => {
      res.status(200).send('OK')
    })
    router.use('/test', testRouter)

    app.use('', router)
    runSwagger(app, router, { ...swaggerConfig, swaggerDoc: { ...swaggerConfig.swaggerDoc, basePath: undefined } })
    const response = await request(app).get(`${swaggerConfig.endpoint}.json`)
    const swaggerJSON = response.body
    expect(swaggerJSON?.paths?.['/test/']?.get).not.toBeUndefined()
  })
  it('runSwagger with test endpoint joi params', async () => {
    const { router, app } = init()
    const testRouter = Router()
    const joiSchema = joi.object().required().keys({
      params: {
        name: joi.string()
      }
    })
    testRouter.get('/:name', createHandler(joiSchema), (_req, res) => {
      res.status(200).send('OK')
    })
    router.use('/test', testRouter)

    app.use('', router)
    runSwagger(app, router, swaggerConfig)
    const response = await request(app).get(`${swaggerConfig.endpoint}.json`)
    const swaggerJSON = response.body
    const swaggerPath = swaggerJSON?.paths?.['/test/{name}']?.get
    expect(swaggerPath).not.toBeUndefined()
    expect(swaggerPath.parameters.find((param: { in: string, name: string }) => param.name === 'name')?.in).toEqual('path')
  })
  it('runSwagger with test endpoint joi required params', async () => {
    const { router, app } = init()
    const testRouter = Router()
    const joiSchema = joi.object().required().keys({
      params: {
        name: joi.string().required()
      }
    })
    testRouter.get('/:name', createHandler(joiSchema), (_req, res) => {
      res.status(200).send('OK')
    })
    router.use('/test', testRouter)

    app.use('', router)
    runSwagger(app, router, swaggerConfig)
    const response = await request(app).get(`${swaggerConfig.endpoint}.json`)
    const swaggerJSON = response.body
    const swaggerPath = swaggerJSON?.paths?.['/test/{name}']?.get
    expect(swaggerPath).not.toBeUndefined()
    expect(swaggerPath.parameters.find((param: { in: string, name: string }) => param.name === 'name')?.in).toEqual('path')
  })
  it('runSwagger with test endpoint joi body and params', async () => {
    const { router, app } = init()
    const testRouter = Router()
    const joiSchema = joi.object().required().keys({
      params: {
        name: joi.string()
      },
      body: {
        name: joi.string()
      }
    })
    testRouter.post('/:name', createHandler(joiSchema), (_req, res) => {
      res.status(200).send('OK')
    })
    router.use('/test', testRouter)

    app.use('', router)
    runSwagger(app, router, swaggerConfig)
    const response = await request(app).get(`${swaggerConfig.endpoint}.json`)
    const swaggerJSON = response.body
    const swaggerPath = swaggerJSON?.paths?.['/test/{name}']?.post
    expect(swaggerPath).not.toBeUndefined()
    expect(swaggerPath.requestBody?.content?.['application/json']?.schema?.properties?.name?.type).toEqual('string')
  })

  it('runSwagger with test endpoint joi body , params and example', async () => {
    const { router, app } = init()
    const testRouter = Router()
    const joiSchema = joi.object().required().keys({
      params: {
        name: joi.string()
      },
      body: {
        name: joi.string()
      }
    }).example({
      params: {
        name: 'testing'
      },
      body: {
        name: 'bodyName'
      }
    })
    testRouter.post('/:name', createHandler(joiSchema), (_req, res) => {
      res.status(200).send('OK')
    })
    router.use('/test', testRouter)

    app.use('', router)
    runSwagger(app, router, swaggerConfig)
    const response = await request(app).get(`${swaggerConfig.endpoint}.json`)
    const swaggerJSON = response.body
    const swaggerPath = swaggerJSON?.paths?.['/test/{name}']?.post
    expect(swaggerPath).not.toBeUndefined()
    expect(swaggerPath.requestBody?.content?.['application/json']?.schema?.properties?.name?.type).toEqual('string')
  })

  it('runSwagger with test endpoint joi body force oneOf line', async () => {
    const { router, app } = init()
    const testRouter = Router()
    const joiSchema = joi.object().required().keys({
      params: {
        name: joi.string()
      },
      body: {
        code: joi.alternatives(joi.string(), joi.number()),
        name: joi.string().when('type', {
          is: joi.string(),
          then: joi.required(),
          otherwise: joi.optional()
        })
      }
    })
    testRouter.post('/:name', createHandler(joiSchema), (_req, res) => {
      res.status(200).send('OK')
    })
    router.use('/test', testRouter)

    app.use('', router)
    runSwagger(app, router, swaggerConfig)
    const response = await request(app).get(`${swaggerConfig.endpoint}.json`)
    const swaggerJSON = response.body
    const swaggerPath = swaggerJSON?.paths?.['/test/{name}']?.post
    expect(swaggerPath).not.toBeUndefined()
    expect(swaggerPath.requestBody?.content?.['application/json']?.schema?.properties?.name?.type).toEqual('string')
  })

  it('runSwagger with test endpoint and response', async () => {
    const { router, app } = init()
    const testRouter = Router()
    const joiSchema = joi.object().required().keys({
      params: {
        name: joi.string()
      },
      body: {
        code: joi.alternatives(joi.string(), joi.number()),
        name: joi.string().when('type', {
          is: joi.string(),
          then: joi.required(),
          otherwise: joi.optional()
        })
      }
    })
    const params = {
      schema: joiSchema,
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
    testRouter.post('/:name', createHandler(params), (_req, res) => {
      res.status(200).send('OK')
    })
    router.use('/test', testRouter)

    app.use('', router)
    runSwagger(app, router, swaggerConfig)
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
    const joiSchema = joi.object().required().keys({
      params: {
        name: joi.string()
      },
      body: {
        code: joi.alternatives(joi.string(), joi.number()),
        name: joi.string().when('type', {
          is: joi.string(),
          then: joi.required(),
          otherwise: joi.optional()
        })
      }
    })
    const params = {
      schema: joiSchema,
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
    testRouter.post('/:name', createHandler(params), (_req, res) => {
      res.status(200).send('OK')
    })
    router.use('/test', testRouter)

    app.use('', router)
    runSwagger(app, router, swaggerConfig)
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
    const joiSchema = joi.object().required().keys({
      params: {
        name: joi.string()
      },
      body: {
        code: joi.alternatives(joi.string(), joi.number()),
        name: joi.string().when('type', {
          is: joi.string(),
          then: joi.required(),
          otherwise: joi.optional()
        })
      }
    })
    const params = {
      schema: joiSchema,
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
    testRouter.post('/:name', createHandler(params), (_req, res) => {
      res.status(200).send('OK')
    })
    router.use('/test', testRouter)

    app.use('', router)
    runSwagger(app, router, swaggerConfig)
    const response = await request(app).get(`${swaggerConfig.endpoint}.json`)
    const swaggerJSON = response.body
    const swaggerPath = swaggerJSON?.paths?.['/test/{name}']?.post
    expect(swaggerPath).not.toBeUndefined()
    expect(swaggerPath.requestBody?.content?.['application/json']?.schema?.properties?.name?.type).toEqual('string')
    expect(swaggerPath?.responses?.['200']?.content?.['application/json']?.schema?.$ref?.includes(params.responseType.type.name)).toBeTruthy()
    expect(swaggerPath?.responses?.['200']?.description).toEqual(params.responseType.description)
  })
  it('runSwagger with test endpoint , response description and operationId', async () => {
    const { router, app } = init()
    const testRouter = Router()
    const joiSchema = joi.object().required().keys({
      params: {
        name: joi.string()
      },
      body: {
        code: joi.alternatives(joi.string(), joi.number()),
        name: joi.string().when('type', {
          is: joi.string(),
          then: joi.required(),
          otherwise: joi.optional()
        })
      }
    })
    const params = {
      schema: joiSchema,
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
    testRouter.post('/:name', createHandler(params), (_req, res) => {
      res.status(200).send('OK')
    })
    router.use('/test', testRouter)

    app.use('', router)
    runSwagger(app, router, swaggerConfig)
    const response = await request(app).get(`${swaggerConfig.endpoint}.json`)
    const swaggerJSON = response.body
    const swaggerPath = swaggerJSON?.paths?.['/test/{name}']?.post
    expect(swaggerPath).not.toBeUndefined()
    expect(swaggerPath.operationId).toEqual(params.operationId)
    expect(swaggerPath.description).toEqual(params.description)
  })

  it('runSwagger error folder', async () => {
    const { router, app } = init()
    const testRouter = Router()
    testRouter.post('/:name', (_req, res) => {
      res.status(200).send('OK')
    })
    router.use('/test', testRouter)

    app.use('', router)
    expect(runSwagger(app, router, { ...swaggerConfig, jsonPath: 'notExist/swagger.json' }).status).toEqual('ERROR')
  })
})
