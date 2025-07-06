import fastify from 'fastify'

import fastifyEnv from '@fastify/env'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUi from '@fastify/swagger-ui'

import { Config, schema } from './cfg'
import circleRoutes from './routes/circle'
import circleSeedPlugin from './plugins/circle'
import gocardlessRoutes from './routes/gocardless'
import { CircleStateType } from './seed/circle'
import cors from '@fastify/cors';

declare module 'fastify' {
    interface FastifyInstance {
        config: Config
        circle: Partial<CircleStateType>
    }
}

export async function buildServer() {
    const server = fastify({ logger: true })

    server.register(cors, {
        origin: ['*'],
        methods: ['GET', 'POST', 'OPTIONS'],
    });

    const formats = addFormats(
        new Ajv({ useDefaults: true, coerceTypes: true, removeAdditional: 'failing' }),
        ['uri']
    )
    await server.register(fastifyEnv, {
        ajv: formats,
        data: process.env,
        schema,
        dotenv: true,
        confKey: 'config',
    })

    console.log('Config loaded:', JSON.stringify(server.config, null, 2))

    await server.register(circleSeedPlugin)


    await server.register(fastifySwagger, {
        openapi: {
            openapi: '3.0.0',
            info: {
                title: 'Payment API',
                description: 'API documentation for the payment service',
                version: '1.0.0',
            },
        },
        mode: 'dynamic',
    })
    await server.register(fastifySwaggerUi, {
        routePrefix: '/docs',
        uiConfig: {
            docExpansion: 'list',
            deepLinking: false,
        },
        staticCSP: true,
        transformSpecification: (swaggerObject, request, reply) => {
            return swaggerObject
        },
        transformSpecificationClone: true,
    })

    await server.register(circleRoutes)
    await server.register(gocardlessRoutes)

    server.get('/', async () => ({ message: 'Welcome to the payment API' }))

    return server
} 