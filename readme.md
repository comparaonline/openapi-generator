
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
import { usersRouter } from './users.router'
import { runSwagger } from '@comparaonline/openapi-generator';
const app=express()
const router=Router()
router.get('/',(_req,res)=>{
    res.status(200).send('Hello World!')
})

router.use('/products',productsRouter)
router.use('/users', usersRouter)
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
To document the responses we must configure in the swaggerConfig the routes where the classes that refer to the response schemas are located and we need to use a different signature than "createHandler".
```javascript
{
//Other configuration ...
 folders: [
    './entities/*.ts'
  ]

//In this case the swagger will add the schemas corresponding to all the classes found within './entities/*.ts'
}

```
#### How do we add responses to the handler?
We can use any of the following two signatures. 
```javascript

interface ResponseType {
  type: //must be a class
  statusCode: StatusCodes
  description?: string
  array?: boolean
}

interface Params {
  schema: ObjectSchema | undefined
  contentType?: string
  responseType: ResponseType
  description?: string
  operationId?: string
}

function createHandler (params: Params): RequestHandlerWithDocumentation
function createHandler (joi: ObjectSchema, responseType: ResponseType): RequestHandlerWithDocumentation

```

#### Example
Example: We have two endpoints, one to list users and another to search by id
The first returns an array of users, the other a user object
/users/list
/users/:id

#### The "User" class inside one of the folders indicated in the configuration
```javascript
export class User{
    firstName:string
    lastName:string
}
```
#### The User's router

```javascript
import joi from 'joi'
import { Router } from 'express';
import { createHandler } from '@comparaonline/openapi-generator';
import { User } from './entities/user';
const findOneSchema = joi.object().unknown().required().keys({
  params: {
    id: joi.number()
  },
  headers: joi.object().unknown().keys({
    "api-key": joi.string().uuid().required()
  })
})

const findAllSchema = joi.object().unknown().required().keys({
  headers: joi.object().unknown().keys({
    "api-key": joi.string().uuid().required()
  })
})

const usersRouter = Router()
usersRouter.get('/list', createHandler(findAllSchema,{statusCode:200,type:User,array:true}), (_req, res, _next) => {
  //your code here
  const users=[new User(),new User()]
  res.status(200).send(users)
})

usersRouter.get('/:id', createHandler(findOneSchema,{statusCode:200,type:User}), (_req, res, _next) => {
  //your code here
  const user=new User()
  res.status(200).send(user)
})

export { usersRouter }
```
FindOne
![Find One User](https://lh3.googleusercontent.com/drive-viewer/AK7aPaA5akSK4qRFPx6ndklb1jukgriRI1vV1yt2aYdRFZ1UtX2MAq-DyU_uM4BbD4KElT8xwRLaRo9VbbNiGJ4OlZ4_OjsRaA=s1600)
FindAll
![Find All User](https://lh3.googleusercontent.com/drive-viewer/AK7aPaDnSuX5omya2sjtNzUCe6oPHJuR1SjtEIGiiZEYe2wj0aNwYspn-14VInYibeNIBHTzefVF3JLivpbmCRehE0tz0ede=s1600)
Schemas
![Schemas](https://lh3.googleusercontent.com/drive-viewer/AK7aPaAUlDZd_UA2wbDFoovonil0mxlptel-X78hOcjhda0KKEKCjkWA8vxbn9i_pU6et841T9bx5qRcD4Ag1QNZZ8NZUZ4c=s1600)

### Complete requestHandler signature
This will allow us to add additional information to our endpoints and is the most complete way to use
- responseType
- schema
- operationId
- description
- contentType

#### Example
```javascript

const searchSchema = joi.object().unknown().required().keys({
  headers: joi.object().unknown().keys({
    "api-key": joi.string().uuid().required()
  }),
  query:{
    name:joi.string()
  }
})

// Add search endpoint
usersRouter.get(
'/search', 
createHandler(
  {
  schema: searchSchema, 
  responseType: {
    statusCode: 200,
    type: User,
    array: true,
    description: 'All users that match the query'
  },
  description:'Search by name',
  operationId:'searchByName',
  contentType:'application/json'
}), (_req, res, _next) => {
  //your code here
  const users = [new User(), new User()]
  res.status(200).send(users)
})
```

Search
![Search Complete](https://lh3.googleusercontent.com/drive-viewer/AK7aPaA_VNfBTda3cVIBPyrzFDpmv-7ofO7S7uPBOz5mThG6wTvAsBtMXF2FxkkHoJuF7IETLqtT5uqaB5CDuftZyCp4fpG7Lw=s1600)