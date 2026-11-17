import { betterAuth } from 'better-auth'
import { APIError, createAuthMiddleware } from 'better-auth/api'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma } from '#/lib/prisma'
import { env } from '#/config/env'

export const auth = betterAuth({
  appName: 'Jayam Granites',
  baseURL: env.betterAuthUrl,
  secret: env.betterAuthSecret,
  trustedOrigins: [env.webOrigin],
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: true,
        defaultValue: 'sales',
        input: false,
      },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (context) => {
      if (context.path !== '/sign-in/email') return
      const email = context.body?.email
      if (typeof email !== 'string') return

      const user = await prisma.user.findUnique({
        where: { email: email.trim().toLowerCase() },
        select: { isSuspended: true },
      })
      if (user?.isSuspended) {
        throw APIError.from('FORBIDDEN', {
          code: 'ACCOUNT_SUSPENDED',
          message: 'This account has been suspended',
        })
      }
    }),
  },
  session: { modelName: 'AuthSession' },
  account: { modelName: 'AuthAccount' },
  verification: { modelName: 'AuthVerification' },
})
