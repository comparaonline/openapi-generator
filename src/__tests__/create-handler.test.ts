/* eslint-disable @typescript-eslint/consistent-type-assertions */
/* eslint-disable @typescript-eslint/no-misused-promises */

import joi from 'joi'
import { z } from 'zod'
import { RequestHandlerWithDocumentation, createHandler, setupOpenApi } from '..'
import { swaggerConfig } from './swaggerConfig'

const joiSchema = joi.object().required().keys({
  body: joi.object().keys({
    name: joi.string()
  })
})

const zodSchema = z.object({
  body: z.object({
    name: z.string()
  })
})

setupOpenApi(swaggerConfig)

const schemaVariants = [
  { name: 'Joi', schema: joiSchema },
  { name: 'Zod', schema: zodSchema }
]

describe.each(schemaVariants)('create-handler ($name)', ({ schema }) => {
  it('create handler function with minimal params', () => {
    const params = {
      schema,
      responseType: {
        statusCode: 200,
        type: {}
      }
    }
    const handler: RequestHandlerWithDocumentation = createHandler(params)
    expect(handler.schema).toEqual(schema)
  })

  it('create handler function with contentType', () => {
    const params = {
      operationId: 'id',
      description: 'description',
      schema,
      contentType: 'application/json',
      responseType: {
        statusCode: 200,
        type: {}
      }
    }
    const handler = createHandler(params)
    expect(handler.schema).toEqual(params.schema)
    expect(handler.contentType).toEqual(params.contentType)
    expect(handler.description).toEqual(params.description)
    expect(handler.operationId).toEqual(params.operationId)
    expect(handler.responseType).toEqual(params.responseType)
  })

  it('create handler function with 2 params', () => {
    const responseType = {
      statusCode: 200,
      type: {}
    }
    const handler = createHandler(schema, responseType)
    expect(handler.schema).toEqual(schema)
  })

  it('should throw an ExceptionError if validation fails', () => {
    const next = jest.fn()
    const req = { body: { name: 1 } }
    const handler = createHandler(schema)
    handler(req as any, {} as any, next)
    expect(handler).toBeInstanceOf(Function)
    expect(next).toHaveBeenCalledWith(expect.any(Error))
  })

  it('should ok - validation ok', () => {
    const next = jest.fn()
    const req = { body: { name: 'name' } }
    const handler = createHandler(schema)
    handler(req as any, {} as any, next)
    expect(handler).toBeInstanceOf(Function)
    expect(next).not.toHaveBeenCalledWith(expect.any(Error))
  })
})

describe('create-handler (Zod params/query/headers passthrough)', () => {
  it('should assign req.params from validated Zod data', () => {
    const schema = z.object({ params: z.object({ id: z.string() }) })
    const next = jest.fn()
    const req: any = { params: { id: '42' } }
    const handler = createHandler(schema)
    handler(req, {} as any, next)
    expect(req.params).toEqual({ id: '42' })
    expect(next).not.toHaveBeenCalledWith(expect.any(Error))
  })

  it('should assign req.query from validated Zod data', () => {
    const schema = z.object({ query: z.object({ search: z.string() }) })
    const next = jest.fn()
    const req: any = { query: { search: 'foo' } }
    const handler = createHandler(schema)
    handler(req, {} as any, next)
    expect(req.query).toEqual({ search: 'foo' })
    expect(next).not.toHaveBeenCalledWith(expect.any(Error))
  })

  it('should assign req.headers from validated Zod data', () => {
    const schema = z.object({ headers: z.object({ 'x-token': z.string() }) })
    const next = jest.fn()
    const req: any = { headers: { 'x-token': 'abc' } }
    const handler = createHandler(schema)
    handler(req, {} as any, next)
    expect(req.headers).toEqual({ 'x-token': 'abc' })
    expect(next).not.toHaveBeenCalledWith(expect.any(Error))
  })
})

describe('create-handler (schema-agnostic)', () => {
  it('create handler function with undefined schema', () => {
    const handler = createHandler(undefined)
    expect(handler.schema).toBeUndefined()
  })

  it('should return a function that takes in Request, Response, and NextFunction', () => {
    const next = jest.fn()
    const handler = createHandler(undefined)
    handler({} as any, {} as any, next)
    expect(handler.schema).toBeUndefined()
    expect(next).toHaveBeenCalled()
  })

  it('should ok - undefined schema', () => {
    const req = { body: { name: 'name' } }
    const next = jest.fn()
    const handler = createHandler(undefined)
    handler(req as any, {} as any, next)
    expect(handler).toBeInstanceOf(Function)
    expect(next).not.toHaveBeenCalledWith(expect.any(Error))
  })
})
