/* eslint-disable @typescript-eslint/explicit-function-return-type */

import { OpenApiGenerator } from './OpenApiGenerator'
import { SwaggerConfig } from './interfaces'
export { createHandler } from './create-handler'
export { runSwagger } from './functions'
export { SwaggerDoc, SwaggerConfig, ResponseType } from './interfaces'
export { RequestHandlerWithDocumentation } from './create-handler'
export function setupOpenApi (swaggerConfig: SwaggerConfig) {
  OpenApiGenerator.swaggerConfig = swaggerConfig
}
