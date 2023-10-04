import { NextFunction, Request, RequestHandler } from 'express'
import { ObjectSchema, isSchema } from 'joi'
import { ResponseType } from './interfaces'
import { StatusCodes } from 'http-status-codes'
import { OpenApiGenerator } from '.'
class ExceptionError extends Error {
  constructor (public statusCode: number, message: string, public code: string) {
    super(message)
  }
}

interface Params {
  schema: ObjectSchema | undefined
  contentType?: string
  responseType: ResponseType
  description?: string
  operationId?: string
}

type RequestHandlerWithDocumentation = RequestHandler & { joi?: ObjectSchema, contentType?: string, responseType?: ResponseType, description?: string, operationId?: string }
function joiMiddleware (joi: ObjectSchema | undefined): RequestHandlerWithDocumentation {
  const middleware: RequestHandlerWithDocumentation = (async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (joi == null) {
        return next()
      }
      const { error, value } = joi.validate(req)
      if (error != null) {
        throw new ExceptionError(StatusCodes.BAD_REQUEST, error.message, 'bad-request')
      }
      req.body = value.body
      req.params = value.params
      req.query = value.query
      req.headers = value.headers
      return next()
    } catch (e) {
      return next(e)
    }
  }) as unknown as RequestHandlerWithDocumentation
  if (OpenApiGenerator.swaggerConfig.active) {
    middleware.joi = joi
  }
  return middleware
}

function createHandler (param1: Params): RequestHandlerWithDocumentation
function createHandler (param1: ObjectSchema | undefined, responseType?: ResponseType): RequestHandlerWithDocumentation
function createHandler (param1?: ObjectSchema | Params | undefined, paramResponseType?: ResponseType): RequestHandlerWithDocumentation {
  const middleware = joiMiddleware(isSchema(param1) ? param1 : param1?.schema)
  if (OpenApiGenerator.swaggerConfig.active) {
    const defaultContentType = 'application/json'
    const contentType: string = ((param1 != null && 'contentType' in param1 && param1.contentType != null) ? param1.contentType : defaultContentType)
    const responseType: ResponseType = paramResponseType != null ? paramResponseType : (param1 as Params)?.responseType
    middleware.contentType = contentType
    middleware.responseType = responseType
    middleware.operationId = (param1 != null && 'operationId' in param1 && param1.operationId != null) ? param1.operationId : undefined
    middleware.description = typeof param1?.description === 'string' ? param1.description : undefined
  }
  return middleware
}

export { createHandler, RequestHandlerWithDocumentation }
