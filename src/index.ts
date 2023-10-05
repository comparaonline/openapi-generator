/* eslint-disable @typescript-eslint/explicit-function-return-type */

import { OpenApiGenerator } from './OpenApiGenerator'
import { SwaggerConfig } from './interfaces'

export { SwaggerDoc, SwaggerConfig, ResponseType } from './interfaces'
export { RequestHandlerWithDocumentation } from './create-handler'
export function setupOpenApi (swaggerConfig: SwaggerConfig) {
  const { createHandler, runSwagger } = new OpenApiGenerator(swaggerConfig)
  return { createHandler, runSwagger }
}
