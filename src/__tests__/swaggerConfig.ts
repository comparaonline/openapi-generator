import { SwaggerConfig } from '../interfaces'

export const swaggerConfig: SwaggerConfig = {
  active: true,
  swaggerDoc: {
    openapi: '3.0.0',
    basePath: '',
    info: {
      title: 'Testing',
      version: '1.0.0',
      description: 'Testing',
      contact: {
        name: 'Insurance Core Team',
        url: 'https://comparaonline.com',
        email: 'info@comparaonline.com'
      },
      termsOfService: 'https://comparaonline.com',
      license: {
        name: 'ComparaOnline',
        url: 'https://comparaonline.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:4000',
        description: 'Development server'
      }
    ]
  },
  folders: [
    'src/__tests__/testing-mocks/*.ts'
  ],
  jsonPath: 'src/__tests__/testing-mocks/swagger.json',
  endpoint: '/api-docs'
}
