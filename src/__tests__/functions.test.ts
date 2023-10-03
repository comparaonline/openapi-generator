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
    // Arrange
    const { router, app } = init()
    const testRouter = Router()
    testRouter.get('/', (_req, res) => {
      res.status(200).send('OK')
    })
    router.use('/test', testRouter)
    app.use('', router)
    // Act
    runSwagger(app, router, swaggerConfig)
    const response = await request(app).get(`${swaggerConfig.endpoint}.json`)
    const swaggerJSON = response.body
    // Assert
    expect(swaggerJSON?.paths?.['/test/']?.get).not.toBeUndefined()
  })
  it('runSwagger with test endpoint without basePath', async () => {
    // Arrange
    const { router, app } = init()
    const testRouter = Router()
    testRouter.get('/', (_req, res) => {
      res.status(200).send('OK')
    })
    router.use('/test', testRouter)
    app.use('', router)
    // Act
    runSwagger(app, router, { ...swaggerConfig, swaggerDoc: { ...swaggerConfig.swaggerDoc, basePath: undefined } })
    const response = await request(app).get(`${swaggerConfig.endpoint}.json`)
    const swaggerJSON = response.body
    // Assert
    expect(swaggerJSON?.paths?.['/test/']?.get).not.toBeUndefined()
  })
  it('runSwagger with test endpoint joi params', async () => {
    // Arrange
    const { router, app } = init()
    const testRouter = Router()
    const joiSchema = joi.object().required().keys({
      params: {
        name: joi.string()
      }
    })
    const handler = createHandler(joiSchema)
    testRouter.get('/:name', handler, (_req, res) => {
      res.status(200).send('OK')
    })
    router.use('/test', testRouter)
    app.use('', router)
    // Act
    runSwagger(app, router, swaggerConfig)
    const response = await request(app).get(`${swaggerConfig.endpoint}.json`)
    const swaggerJSON = response.body
    const swaggerPath = swaggerJSON?.paths?.['/test/{name}']?.get
    // Assert
    expect(swaggerPath).not.toBeUndefined()
    expect(swaggerPath.parameters.find((param: { in: string, name: string }) => param.name === 'name')?.in).toEqual('path')
  })
  it('runSwagger with test endpoint joi required params', async () => {
    // Arrange
    const { router, app } = init()
    const testRouter = Router()
    const joiSchema = joi.object().required().keys({
      params: {
        name: joi.string().required()
      }
    })
    const handler = createHandler(joiSchema)
    testRouter.get('/:name', handler, (_req, res) => {
      res.status(200).send('OK')
    })
    router.use('/test', testRouter)
    app.use('', router)
    // Act
    runSwagger(app, router, swaggerConfig)
    const response = await request(app).get(`${swaggerConfig.endpoint}.json`)
    const swaggerJSON = response.body
    const swaggerPath = swaggerJSON?.paths?.['/test/{name}']?.get
    // Assert
    expect(swaggerPath).not.toBeUndefined()
    expect(swaggerPath.parameters.find((param: { in: string, name: string }) => param.name === 'name')?.in).toEqual('path')
  })
  it('runSwagger with test endpoint joi body and params', async () => {
    // Arrange
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
    const handler = createHandler(joiSchema)
    testRouter.post('/:name', handler, (_req, res) => {
      res.status(200).send('OK')
    })
    router.use('/test', testRouter)
    app.use('', router)
    // Act
    runSwagger(app, router, swaggerConfig)
    const response = await request(app).get(`${swaggerConfig.endpoint}.json`)
    const swaggerJSON = response.body
    const swaggerPath = swaggerJSON?.paths?.['/test/{name}']?.post
    // Assert
    expect(swaggerPath).not.toBeUndefined()
    expect(swaggerPath.requestBody?.content?.['application/json']?.schema?.properties?.name?.type).toEqual('string')
  })

  it('runSwagger with test endpoint joi body , params and example', async () => {
    // Arrange
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
    const handler = createHandler(joiSchema)
    testRouter.post('/:name', handler, (_req, res) => {
      res.status(200).send('OK')
    })
    router.use('/test', testRouter)
    app.use('', router)
    // Act
    runSwagger(app, router, swaggerConfig)
    const response = await request(app).get(`${swaggerConfig.endpoint}.json`)
    const swaggerJSON = response.body
    const swaggerPath = swaggerJSON?.paths?.['/test/{name}']?.post
    // Assert
    expect(swaggerPath).not.toBeUndefined()
    expect(swaggerPath.requestBody?.content?.['application/json']?.schema?.properties?.name?.type).toEqual('string')
  })

  it('runSwagger with test endpoint joi body force oneOf line', async () => {
    // Arrange
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
    const handler = createHandler(joiSchema)
    testRouter.post('/:name', handler, (_req, res) => {
      res.status(200).send('OK')
    })
    router.use('/test', testRouter)
    app.use('', router)
    // Act
    runSwagger(app, router, swaggerConfig)
    const response = await request(app).get(`${swaggerConfig.endpoint}.json`)
    const swaggerJSON = response.body
    const swaggerPath = swaggerJSON?.paths?.['/test/{name}']?.post
    // Assert
    expect(swaggerPath).not.toBeUndefined()
    expect(swaggerPath.requestBody?.content?.['application/json']?.schema?.properties?.name?.type).toEqual('string')
  })

  it('runSwagger with test endpoint and response', async () => {
    // Arrange
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
    const handler = createHandler(params)
    testRouter.post('/:name', handler, (_req, res) => {
      res.status(200).send('OK')
    })
    router.use('/test', testRouter)
    app.use('', router)
    // Act
    runSwagger(app, router, swaggerConfig)
    const response = await request(app).get(`${swaggerConfig.endpoint}.json`)
    const swaggerJSON = response.body
    const swaggerPath = swaggerJSON?.paths?.['/test/{name}']?.post
    // Assert
    expect(swaggerPath).not.toBeUndefined()
    expect(swaggerPath.requestBody?.content?.['application/json']?.schema?.properties?.name?.type).toEqual('string')
    expect(swaggerPath?.responses?.['200']?.content?.['application/json']?.schema?.$ref?.includes(params.responseType.type.name)).toBeTruthy()
  })
  it('runSwagger with test endpoint and array response', async () => {
    // Arrange
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
    const handler = createHandler(params)
    testRouter.post('/:name', handler, (_req, res) => {
      res.status(200).send('OK')
    })
    router.use('/test', testRouter)
    app.use('', router)
    // Act
    runSwagger(app, router, swaggerConfig)
    const response = await request(app).get(`${swaggerConfig.endpoint}.json`)
    const swaggerJSON = response.body
    const swaggerPath = swaggerJSON?.paths?.['/test/{name}']?.post
    // Assert
    expect(swaggerPath).not.toBeUndefined()
    expect(swaggerPath.requestBody?.content?.['application/json']?.schema?.properties?.name?.type).toEqual('string')
    expect(swaggerPath?.responses?.['200']?.content?.['application/json']?.schema?.type).toEqual('array')
    expect(swaggerPath?.responses?.['200']?.content?.['application/json']?.schema?.items?.$ref?.includes(params.responseType.type.name)).toBeTruthy()
  })
  it('runSwagger with test endpoint and response description', async () => {
    // Arrange
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
    const handler = createHandler(params)
    testRouter.post('/:name', handler, (_req, res) => {
      res.status(200).send('OK')
    })
    router.use('/test', testRouter)
    app.use('', router)
    // Act
    runSwagger(app, router, swaggerConfig)
    const response = await request(app).get(`${swaggerConfig.endpoint}.json`)
    const swaggerJSON = response.body
    const swaggerPath = swaggerJSON?.paths?.['/test/{name}']?.post
    // Assert
    expect(swaggerPath).not.toBeUndefined()
    expect(swaggerPath.requestBody?.content?.['application/json']?.schema?.properties?.name?.type).toEqual('string')
    expect(swaggerPath?.responses?.['200']?.content?.['application/json']?.schema?.$ref?.includes(params.responseType.type.name)).toBeTruthy()
    expect(swaggerPath?.responses?.['200']?.description).toEqual(params.responseType.description)
  })
  it('runSwagger with test endpoint , response description and operationId', async () => {
    // Arrange
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
    const handler = createHandler(params)
    testRouter.post('/:name', handler, (_req, res) => {
      res.status(200).send('OK')
    })
    router.use('/test', testRouter)
    app.use('', router)
    // Act
    runSwagger(app, router, swaggerConfig)
    const response = await request(app).get(`${swaggerConfig.endpoint}.json`)
    const swaggerJSON = response.body
    const swaggerPath = swaggerJSON?.paths?.['/test/{name}']?.post
    // Assert
    expect(swaggerPath).not.toBeUndefined()
    expect(swaggerPath.operationId).toEqual(params.operationId)
    expect(swaggerPath.description).toEqual(params.description)
  })

  it('runSwagger error folder', async () => {
    // Arrange
    const { router, app } = init()
    const testRouter = Router()
    testRouter.post('/:name', (_req, res) => {
      res.status(200).send('OK')
    })
    router.use('/test', testRouter)
    app.use('', router)
    // Act
    const run = runSwagger(app, router, { ...swaggerConfig, jsonPath: 'notExist/swagger.json' })
    // Assert
    expect(run.status).toEqual('ERROR')
  })
})
