
# Open API Generator
## @comparaonline/openapi-generator

Open API Generator is a tool that generates OpenAPI documentation and validates requests using Joi. It also provides an endpoint for viewing the OpenAPI documentation in both Swagger UI and JSON formats.


## Installation

Install with yarn

```bash
  yarn add @comparaonline/openapi-generator
```
    
Install with npm

```bash
  npm install @comparaonline/openapi-generator
```
    
## Initialization

#### Create a config file and exports {runSwagger,createHandler}

```javascript


import { SwaggerConfig, setupOpenApi } from '@comparaonline/openapi-generator';

const swaggerConfig: SwaggerConfig = {
  swaggerDoc: {
    openapi: '3.0.0',
    basePath: '/api/v1',
    info: {
      title: 'My API',
      version: '1.0.0',
      description: ' ',
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
      },
      {
        url: 'https://devserver.com',
        description: 'Staging server'
      },
      {
        url: 'https://productionserver.com',
        description: 'Production server'
      }
    ]
  },
  folders: [
    './entities/*.ts'
  ],
  jsonPath: './docs/swagger.json',
  endpoint: '/open-api',
  active: true
}
setupOpenApi(swaggerConfig)
```

#### Add runSwagger to app and main router in the main file

```javascript
import express, { Router } from "express"
import { productsRouter } from "./products.router"
import { runSwagger } from '@comparaonline/openapi-generator';
const app=express()
const router=Router()
router.get('/',(_req,res)=>{
    res.status(200).send('Hello World!')
})

router.use('/products',productsRouter)
app.use('/api/v1/',router)
//added here
runSwagger(app,router)
const port=process.env.PORT ?? 3000
app.listen(port,()=>console.log(`APP listening on port ${port}`))
```

#### Use the "createHandler" with joi to validate and document the "request"
-- The "joi" should be assimilated to the way in which express receives the "request"
It must contain the structure --
- body
- params
- query
```javascript
//Products Router Example

import joi from 'joi'
import { Router } from 'express';
import { createHandler } from '@comparaonline/openapi-generator';

//Joi Schema

import joi from 'joi'
import { Router } from 'express';
import { createHandler } from './openapi.config';
const schema=joi.object().unknown().required().keys({
    params: {
      id: joi.number()
    }
  })

const productsRouter=Router()

productsRouter.get('/search/:id',createHandler(schema),(_req,res,_next)=>{
    //your code here
    res.status(200).send('OK')
})

export {productsRouter}
```


The joi will not only validate that your parameters are correct but will also generate the documentation

### Query Params

To add query params you must follow the same logic as for path params in this way, the following example contains path and query params

```javascript

const schema=joi.object().unknown().required().keys({
    params: {
      id: joi.number()
    },
    query:{
      search:joi.string().required()
    }
  })

productsRouter.get('/search/:id',createHandler(schema),(_req,res,_next)=>{
    //your code here
    res.status(200).send('OK')
})
```

### Headers 

To add headers you must follow the same logic as for path and query params in this way, the following example contains path , query params and headers

```javascript

const schema = joi.object().unknown().required().keys({
  params: {
    id: joi.number()
  },
  query: {
    search: joi.string()
  },
  headers: joi.object().unknown().keys({
    "api-key": joi.string().uuid().required()
  })
})

productsRouter.get('/search/:id',createHandler(schema),(_req,res,_next)=>{
    //your code here
    res.status(200).send('OK')
})
```

The result is something like this
//TODO

- This is the "endpoint" indicated in the configuration
/api/v1/open-api
![Swagger](https://lh3.googleusercontent.com/drive-viewer/AK7aPaC9PILp4VzgFsWFjnBHfty_mCEhpUXCo0jzxF9firP5BipTrqNkpYMAKxSmbgO93wgbhy6jtIQl8UGGC2NwPdcZHk56Rg=s1600)

![Swagger opened](https://lh3.googleusercontent.com/drive-viewer/AK7aPaDXgU1oyxVdP1D85vylyprLUbqzpUsesQjhUqwxf7fvA5UifW-8qFElqlN-1JCSjnrHGh8zEt0auE5rubyp5Xr4MJ3_=s1600)

- If we want to obtain the raw json to import it into "postman" for example, we simply need to add ".json" to the url
/api/v1/open-api.json

```json
{"openapi":"3.0.0","info":{"title":"My API","version":"1.0.0","description":" ","contact":{"name":"Insurance Core Team","url":"https://comparaonline.com","email":"info@comparaonline.com"},"termsOfService":"https://comparaonline.com","license":{"name":"ComparaOnline","url":"https://comparaonline.com"}},"servers":[{"url":"http://localhost:3000/api/v1","description":"Development server"},{"url":"https://devserver.com/api/v1","description":"Staging server"},{"url":"https://productionserver.com/api/v1","description":"Production server"}],"paths":{"/":{"get":{"operationId":"/_get","description":"","responses":{"200":{"description":""}},"tags":[""]}},"/products/search/{id}":{"get":{"operationId":"/products/search/{id}_get","description":"","responses":{"200":{"description":""}},"tags":["products"],"parameters":[{"in":"header","name":"api-key","required":true,"schema":{"type":"string","format":"uuid"}},{"in":"query","name":"search","required":false,"schema":{"type":"string"}},{"in":"path","name":"id","required":false,"schema":{"type":"number","format":"float"}}]}}},"components":{"schemas":{"ExampleResponse":{"type":"object","properties":{"name":{"type":"string"}},"additionalProperties":false}}}}
```
### Responses
