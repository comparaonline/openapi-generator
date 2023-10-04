
import { createHandler } from './create-handler'
import { SwaggerConfig } from './interfaces'
import { runSwagger } from './functions'
export { SwaggerDoc, SwaggerConfig, ResponseType } from './interfaces'
export { RequestHandlerWithDocumentation } from './create-handler'
export class OpenApiGenerator {
  static swaggerConfig: SwaggerConfig
  constructor (swaggerConfig: SwaggerConfig) {
    OpenApiGenerator.swaggerConfig = swaggerConfig
  }

  createHandler = createHandler
  runSwagger = runSwagger
}
