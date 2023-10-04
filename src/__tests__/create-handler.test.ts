/* eslint-disable @typescript-eslint/consistent-type-assertions */
/* eslint-disable @typescript-eslint/no-misused-promises */

import joi from 'joi'
import { OpenApiGenerator, RequestHandlerWithDocumentation } from '..'
import { swaggerConfig } from './swaggerConfig'

const joiSchema = joi.object().required().keys({
  body: joi.object().keys({
    name: joi.string()
  })
})
const openApiGenerator = new OpenApiGenerator(swaggerConfig)
describe('create-handler', () => {
  it('create handler function with minimal params', () => {
    // Arrange
    const params = {
      schema: joiSchema,
      responseType: {
        statusCode: 200,
        type: {}
      }
    }
    // Act
    const handler: RequestHandlerWithDocumentation = openApiGenerator.createHandler(params)
    // Assert
    expect(handler.joi).toEqual(joiSchema)
  })
  it('create handler function with contentType', () => {
    // Arrange
    const params = {
      operationId: 'id',
      description: 'description',
      schema: joiSchema,
      contentType: 'application/json',
      responseType: {
        statusCode: 200,
        type: {}
      }
    }
    // Act
    const handler = openApiGenerator.createHandler(params)
    // Assert
    expect(handler.joi).toEqual(params.schema)
    expect(handler.contentType).toEqual(params.contentType)
    expect(handler.description).toEqual(params.description)
    expect(handler.operationId).toEqual(params.operationId)
    expect(handler.responseType).toEqual(params.responseType)
  })
  it('create handler function with 2 params', () => {
    // Arrange
    const params = {
      statusCode: 200,
      type: {}
    }
    // Act
    const handler = openApiGenerator.createHandler(
      joiSchema, params
    )
    // Assert
    expect(handler.joi).toEqual(joiSchema)
  })

  it('create handler function with undefined joi', () => {
    // Act
    const handler = openApiGenerator.createHandler(undefined)
    // Assert
    expect(handler.joi).toBeUndefined()
  })
  it('should return a function that takes in Request, Response, and NextFunction', () => {
    // Arrange
    const next = jest.fn()
    // Act
    const handler = openApiGenerator.createHandler(undefined)
    handler({} as any, {} as any, next)
    // Assert
    expect(handler.joi).toBeUndefined()
    expect(next).toHaveBeenCalled()
  })

  it('should throw an ExceptionError if validation fails', () => {
    // Arrange
    const next = jest.fn()
    const req = { body: { name: 1 } }
    // Act
    const handler = openApiGenerator.createHandler(joiSchema)
    handler(req as any, {} as any, next)
    // Assert
    expect(handler).toBeInstanceOf(Function)
    expect(next).toHaveBeenCalledWith(expect.any(Error))
  })
  it('should ok - validation ok', () => {
    // Arrange
    const next = jest.fn()
    const req = { body: { name: 'name' } }
    // Act
    const handler = openApiGenerator.createHandler(joiSchema)
    handler(req as any, {} as any, next)
    // Assert
    expect(handler).toBeInstanceOf(Function)
    expect(next).not.toHaveBeenCalledWith(expect.any(Error))
  })

  it('should ok - undefined joi', () => {
    // Arrange
    const req = { body: { name: 'name' } }
    const next = jest.fn()
    // Act
    const handler = openApiGenerator.createHandler(undefined)
    handler(req as any, {} as any, next)
    // Assert
    expect(handler).toBeInstanceOf(Function)
    expect(next).not.toHaveBeenCalledWith(expect.any(Error))
  })
})
