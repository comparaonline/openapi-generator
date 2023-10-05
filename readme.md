
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
    
## Configuration

#### Create a config file and exports {runSwagger,createHandler}

```javascript


import { SwaggerConfig, setupOpenApi } from '@comparaonline/openapi-generator';

const swaggerConfig: SwaggerConfig = {
  swaggerDoc: {
    openapi: '3.0.0',
    basePath: '/v1/api',
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
const {runSwagger,createHandler}=setupOpenApi(swaggerConfig)
export {runSwagger,createHandler}
```

#### Add runSwagger to app and main router in the main file

```javascript
import express, { Router } from "express"
import { productsRouter } from "./products.router"
import { runSwagger } from "./openapi.config"
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
const schema=joi.object().required().keys({
    params: {
      id: joi.string()
    }
  })

const productsRouter=Router()

productsRouter.get('/search/:id',createHandler(schema),(_req,res,_next)=>{
    //your code here
    res.status(200).send('OK')
})

export {productsRouter}
```

In this case, by adding the parameters, we get something like this
![Params Image]()

The joi will not only validate that your parameters are correct but will also generate the documentation

### Query Params

To add query params you must follow the same logic as for path params in this way, the following example contains path and query params

```javascript

const schema=joi.object().required().keys({
    params: {
      id: joi.string()
    },
    query:{
      search:joi.number()
    }
  })

productsRouter.get('/search/:id',createHandler(schema),(_req,res,_next)=>{
    //your code here
    res.status(200).send('OK')
})
```

The result is something like this
//TODO
![Query and Params Image]()

### Responses
