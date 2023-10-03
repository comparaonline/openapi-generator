import { StatusCodes } from 'http-status-codes'

interface SwaggerDoc {
  openapi: string
  basePath?: string
  info: {
    title: string
    version: string
    description: string
    contact: {
      name: string
      url: string
      email: string
    }
    termsOfService: string
    license: {
      name: string
      url: string
    }
  }
  servers: Array<{
    url: string
    description: string
  }>
}

interface SwaggerConfig {
  swaggerDoc: SwaggerDoc
  folders: string[]
  jsonPath: string
  endpoint: string
  active: boolean
}

interface ResponseType {
  type: any
  statusCode: StatusCodes
  description?: string
  array?: boolean
}

export { SwaggerDoc, SwaggerConfig, ResponseType }
