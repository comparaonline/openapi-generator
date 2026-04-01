import { NextFunction, Request, Response, RequestHandler } from 'express'
import { ObjectSchema, isSchema } from 'joi'
import { ResponseType } from './interfaces'
import { StatusCodes } from 'http-status-codes'
import { OpenApiGenerator } from './OpenApiGenerator'

interface ZodIssue { path: PropertyKey[], message: string }
interface ZodLike { safeParse: (data: unknown) => { success: true, data: any } | { success: false, error: { issues: ZodIssue[] } } }
type ValidationSchema = ObjectSchema | ZodLike

class ExceptionError extends Error {
  constructor (public statusCode: number, message: string, public code: string) {
    super(message)
  }
}

interface Params {
  schema: ValidationSchema | undefined
  contentType?: string
  responseType: ResponseType
  description?: string
  operationId?: string
}

type RequestHandlerWithDocumentation = RequestHandler & { joi?: ObjectSchema, schema?: ValidationSchema, contentType?: string, responseType?: ResponseType, description?: string, operationId?: string }

function schemaMiddleware (schema: ValidationSchema | undefined): RequestHandlerWithDocumentation {
  const middleware: RequestHandlerWithDocumentation = (async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schema == null) {
        return next()
      }
      if (isSchema(schema)) {
        const { error, value } = schema.validate(req)
        if (error != null) {
          throw new ExceptionError(StatusCodes.BAD_REQUEST, error.message, 'bad-request')
        }
        req.body = value.body
        req.params = value.params
        req.query = value.query
        req.headers = value.headers
      } else {
        const result = schema.safeParse(req)
        if (!result.success) {
          const message = result.error.issues.map((i: ZodIssue) => `${i.path.map(String).join('.')}: ${i.message}`).join('; ')
          throw new ExceptionError(StatusCodes.BAD_REQUEST, message, 'bad-request')
        }
        req.body = result.data.body
        req.params = result.data.params
        req.query = result.data.query
        req.headers = result.data.headers
      }
      return next()
    } catch (e) {
      return next(e)
    }
  }) as unknown as RequestHandlerWithDocumentation
  if (OpenApiGenerator.swaggerConfig.active) {
    middleware.schema = schema
    if (isSchema(schema)) {
      middleware.joi = schema as ObjectSchema
    }
  }
  return middleware
}

function createHandler (param1: Params): RequestHandlerWithDocumentation
function createHandler (param1: ValidationSchema | undefined, responseType?: ResponseType): RequestHandlerWithDocumentation
function createHandler (param1?: ValidationSchema | Params | undefined, paramResponseType?: ResponseType): RequestHandlerWithDocumentation {
  const s = param1 == null
    ? undefined
    : isSchema(param1)
      ? param1
      : 'safeParse' in (param1 as object)
        ? param1 as ZodLike
        : (param1 as Params).schema
  const middleware = schemaMiddleware(s)
  if (OpenApiGenerator.swaggerConfig.active) {
    const defaultContentType = 'application/json'
    const contentType: string = ((param1 != null && 'contentType' in param1 && param1.contentType != null) ? param1.contentType : defaultContentType)
    const responseType: ResponseType = paramResponseType != null ? paramResponseType : (param1 as Params)?.responseType
    middleware.contentType = contentType
    middleware.responseType = responseType
    middleware.operationId = (param1 != null && 'operationId' in param1 && param1.operationId != null) ? param1.operationId : undefined
    middleware.description = typeof (param1 as Params)?.description === 'string' ? (param1 as Params).description : undefined
  }
  return middleware
}

export { createHandler, RequestHandlerWithDocumentation, ValidationSchema }
