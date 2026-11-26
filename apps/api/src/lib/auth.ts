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
      // Profile updates are name-only. Email, role, password, and account
      // deletion are intentionally not exposed to users.
      const isBlockedAccountEdit =
        context.path === '/change-password' ||
        context.path === '/change-email' ||
        context.path === '/set-password' ||
        context.path === '/request-password-reset' ||
        context.path.startsWith('/reset-password') ||
        context.path.startsWith('/delete-user')
      if (isBlockedAccountEdit) {
        throw APIError.from('FORBIDDEN', {
          code: 'ACCOUNT_EDITS_DISABLED',
          message: 'Account changes are managed by an administrator',
        })
      }

      if (context.path === '/update-user') {
        const body = (context.body ?? {}) as Record<string, unknown>
        const keys = Object.keys(body)
        const name = body.name
        if (
          keys.length !== 1 ||
          keys[0] !== 'name' ||
          typeof name !== 'string' ||
          !name.trim() ||
          name.trim().length > 100
        ) {
          throw APIError.from('BAD_REQUEST', {
            code: 'PROFILE_NAME_ONLY',
            message: 'Only your display name can be updated from profile settings',
          })
        }
        body.name = name.trim()
        return
      }

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
