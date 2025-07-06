import fp from "fastify-plugin"

import { seedCircle } from '../seed/circle'

const circleSeedPlugin = fp(async (fastify) => {
    fastify.decorate("circle", await seedCircle(fastify.config))
})

export default circleSeedPlugin 