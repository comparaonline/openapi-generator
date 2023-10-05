
import { SwaggerConfig } from './interfaces'

interface ConfigI {
  swaggerConfig: SwaggerConfig
}

export const OpenApiGenerator: ConfigI = {
  swaggerConfig: { active: false } as unknown as SwaggerConfig
}
