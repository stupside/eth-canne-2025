import { buildServer } from './server'

async function start() {
    const server = await buildServer()
    try {
        await server.listen({ port: 8080, host: '0.0.0.0' })
    } catch (err) {
        server.log.error(err)
        process.exit(1)
    }
}

start()