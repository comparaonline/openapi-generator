/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-useless-escape */
/* eslint-disable @typescript-eslint/prefer-optional-chain */

import { Application, Router } from 'express'
import j2s from 'joi-to-swagger'
import { createGenerator } from 'ts-json-schema-generator'
import { StatusCodes } from 'http-status-codes'
import { existsSync, writeFileSync, readFileSync } from 'fs'
import { serve, setup } from 'swagger-ui-express'
import { ResponseType, SwaggerConfig, SwaggerDoc } from './interfaces'
import { RequestHandlerWithDocumentation } from './create-handler'
import { OpenApiGenerator } from './OpenApiGenerator'

function removeNullProperties (properties: any): void {
  for (const key in properties) {
    const property = properties[key]
    delete property.const
    if (property.anyOf != null) {
      property.anyOf = property.anyOf.filter((p: any) => p.type !== 'null')
    }
    if (property.type != null) {
      if (Array.isArray(property.type)) {
        property.type = property.type.filter((p: string) => p !== 'null')
        if (property.type.length === 1) {
          property.type = property.type[0]
        } else {
          property.oneOf = property.type.map((p: string) => ({ type: p }))
          delete property.type
        }
      }
    }
  }
}

function listEndpoints (
  app: Application,
  swaggerConfig: SwaggerConfig
): SwaggerDoc & { paths: any, components: { schemas: any } } {
  const swaggerSchema: SwaggerDoc & {
    paths: any
    components: { schemas: any }
  } = {
    ...swaggerConfig.swaggerDoc,
    paths: {},
    components: {
      schemas: {}
    }
  }

  for (const folder of swaggerConfig.folders) {
    const schema = createGenerator({
      skipTypeCheck: true,
      path: folder,
      discriminatorType: 'open-api'
    }).createSchema('*')

    for (const key in schema.definitions) {
      if (schema.definitions[key] != null) {
        removeNullProperties((schema.definitions[key] as any).properties)
      }
    }

    swaggerSchema.components.schemas = {
      ...swaggerSchema.components.schemas,
      ...JSON.parse(
        JSON.stringify(schema.definitions).replace(
          /#\/definitions\//g,
          '#/components/schemas/'
        )
      )
    }
  }

  function exploreRoutes (router: Router, basePath = ''): void {
    router.stack.forEach((layer: any) => {
      if (layer.route != null) {
        const { route } = layer
        const methods = Object.keys(route.methods).filter(
          (method) => method !== '_all' && method !== '_length'
        )

        for (let j = 0; j < methods.length; j++) {
          const method = methods[j]
          let controller: RequestHandlerWithDocumentation | undefined
          if (route.stack != null) {
            controller = route.stack.find(
              (stack: any) =>
                stack.handle.joi != null || stack.handle.responseType != null
            )?.handle
          }

          let responseOptions: any = {
            [StatusCodes.OK]: {
              description: ''
            }
          }

          const joi = controller?.joi
          const responseType: ResponseType | undefined =
            controller?.responseType

          if (responseType != null) {
            const response =
              responseType.array === true
                ? {
                    schema: {
                      type: 'array',
                      items: {
                        $ref: `#/components/schemas/${
                          responseType.type.name as string
                        }`
                      }
                    }
                  }
                : {
                    schema: {
                      $ref: `#/components/schemas/${
                        responseType.type.name as string
                      }`
                    }
                  }

            responseOptions = {
              [responseType.statusCode]: {
                description: responseType.description ?? '',
                content: {
                  'application/json': response
                }
              }
            }
          }

          const options: {
            tags: string[]
            parameters?: any[]
            requestBody?: any
          } = {
            tags: [
              basePath
                .slice((swaggerSchema.basePath?.length ?? 0) + 1)
                .slice(0, -1)
            ]
          }

          if (joi != null) {
            const { swagger } = j2s(joi)
            if (swagger.properties != null && swagger.properties.body != null) {
              options.requestBody = {
                content: {
                  [(controller as RequestHandlerWithDocumentation)
                    .contentType as string]: {
                    schema: swagger.properties.body
                  }
                }
              }
              if (swagger.example != null) {
                options.requestBody.content[
                  (controller as RequestHandlerWithDocumentation)
                    .contentType as string
                ].examples = { custom: { value: swagger.example.body } }
              }
            }

            if (swagger.properties != null) {
              const allowedParameters = [
                { name: 'params', in: 'path' },
                { name: 'query', in: 'query' },
                { name: 'headers', in: 'header' }
              ]
              if (options.parameters == null) {
                options.parameters = []
              }
              for (const allowedParam of allowedParameters) {
                if (swagger.properties[allowedParam.name] != null) {
                  const properties = JSON.parse(
                    JSON.stringify(swagger.properties[allowedParam.name])
                  )

                  options.parameters = Object.keys(properties.properties)
                    .map((property) => ({
                      in: allowedParam.in,
                      name: property,
                      required:
                        properties.required?.includes(property) ?? false,
                      schema: properties.properties[property]
                    }))
                    .concat(options.parameters)
                }
              }
            }
          }

          const path: string =
            route.path.toString().length > 1
              ? route.path
                .toString()
                .slice(1)
                .replace(/:([^/]+)/g, '{$1}')
              : ''
          const swaggerPath = `${basePath}${path}`.slice(
            swaggerSchema.basePath?.length ?? 0
          )

          if (swaggerSchema.paths[swaggerPath] == null) {
            swaggerSchema.paths[swaggerPath] = {}
          }

          swaggerSchema.paths[swaggerPath][method] = JSON.parse(
            JSON.stringify({
              operationId:
                controller?.operationId ?? `${swaggerPath}_${method}`,
              description: controller?.description ?? '',
              responses: responseOptions,
              ...options
            })
          )
        }
      } else if (layer.name === 'router') {
        const subRouter: any = layer.handle
        // Construimos el subPath usando los nombres de layer.keys
        let replacedSource = layer.regexp.source

        // Iteramos sobre los parámetros dinámicos (layer.keys)
        if (layer.keys?.length > 0) {
          layer.keys.forEach((key: { name: string }) => {
            // Reemplazamos los grupos capturados en el source por los nombres
            replacedSource = replacedSource.replace(
              /\(\?:\\\/\(\[\^\/\]\+\?\)\)/,
              `/{${key.name}}`
            )
          })
        }

        // Limpiamos caracteres residuales no deseados
        const cleanedPath: string = replacedSource
          .replace(/^\^/, '') // Quitamos el `^` inicial
          .replace(/\\\//g, '/') // Convertimos `\/` a `/`
          .replace(/\(\?\:.*?\)\$/g, '') // Eliminamos grupos opcionales al final
          .replace(/\(\?.*?\)/g, '') // Eliminamos cualquier grupo opcional residual

        // Concatenamos con basePath
        const subPath = `${basePath}${cleanedPath}`

        exploreRoutes(
          subRouter,
          subPath
            .replace(/\\/g, '')
            .replace(/\^/g, '')
            .replace(/\/\?/g, '/')
            .replace(/\(\?\=\/\|/g, '')
            .replace(/\/+/g, '/')
            .replace(/:([^/]+)/g, '{$1}')
        )
      }
    })
  }

  exploreRoutes(app._router)

  swaggerSchema.servers.forEach((server: { url: string }) => {
    server.url = `${server.url}${swaggerSchema.basePath ?? ''}`
  })

  delete swaggerSchema.basePath

  return swaggerSchema
}

export function runSwagger (
  app: Application,
  router: Router
): { status: 'OK' | 'ERROR', error?: any } {
  try {
    const swaggerConfig = OpenApiGenerator.swaggerConfig
    if (swaggerConfig.active) {
      if (!existsSync(swaggerConfig.jsonPath.toString())) {
        writeFileSync(
          swaggerConfig.jsonPath.toString(),
          JSON.stringify(listEndpoints(app, swaggerConfig)),
          { encoding: 'utf-8' }
        )
      }
      const swaggerDocument = JSON.parse(
        readFileSync(swaggerConfig.jsonPath.toString(), { encoding: 'utf-8' })
      )
      router.use(swaggerConfig.endpoint, serve)
      router.get(swaggerConfig.endpoint, setup(swaggerDocument))
      router.get(`${swaggerConfig.endpoint}.json`, (_req, res) => {
        res.status(200).send(swaggerDocument)
      })
    }
    return { status: 'OK' }
  } catch (error) {
    console.log(error)
    return { status: 'ERROR', error }
  }
}
