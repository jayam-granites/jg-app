import { Hono } from 'hono'
import { vValidator } from '@hono/valibot-validator'
import { boolean, email, maxLength, minLength, object, picklist, pipe, string } from 'valibot'
import { canManageRole, ROLES } from '@jg-app/shared'
import { requirePermission, type AuthEnvironment } from '#/middleware/authorization'
import { ForbiddenError } from '#/lib/errors'
import { userService } from './users.service'

const CreateUserSchema = object({
  name: pipe(string(), minLength(1, 'Name is required')),
  email: pipe(string(), email('Invalid email address')),
  password: pipe(string(), minLength(8, 'Password must be at least 8 characters')),
  role: picklist(ROLES),
})

const UpdateUserRoleSchema = object({
  role: picklist(ROLES),
})

const SuspendUserSchema = object({
  isSuspended: boolean(),
})

const UpdatePasswordSchema = object({
  password: pipe(
    string(),
    minLength(8, 'Password must be at least 8 characters'),
    maxLength(128, 'Password cannot exceed 128 characters'),
  ),
})

export const userRoutes = new Hono<AuthEnvironment>()
  .use('*', requirePermission('users:manage'))
  .get('/', async (c) => {
    const users = await userService.getAll()
    return c.json({ data: users })
  })
  .get('/:id', async (c) => {
    const user = await userService.getById(c.req.param('id'))
    return c.json({ data: user })
  })
  .post('/', vValidator('json', CreateUserSchema), async (c) => {
    const data = c.req.valid('json')
    const caller = c.get('user')
    if (!canManageRole(caller.role, data.role)) {
      throw new ForbiddenError('You cannot assign a role above your own')
    }
    const user = await userService.create(data)
    return c.json({ data: user }, 201)
  })
  .patch('/:id', vValidator('json', UpdateUserRoleSchema), async (c) => {
    const caller = c.get('user')
    const { role } = c.req.valid('json')
    if (!canManageRole(caller.role, role)) {
      throw new ForbiddenError('You cannot assign a role above your own')
    }
    await userService.updateRole(c.req.param('id'), role, caller)
    return c.json({ data: null, message: 'User role updated' })
  })
  .patch('/:id/suspension', vValidator('json', SuspendUserSchema), async (c) => {
    const caller = c.get('user')
    const { isSuspended } = c.req.valid('json')
    await userService.setSuspended(c.req.param('id'), isSuspended, caller)
    return c.json({ data: null, message: isSuspended ? 'User suspended' : 'User reactivated' })
  })
  .put('/:id/password', vValidator('json', UpdatePasswordSchema), async (c) => {
    const caller = c.get('user')
    const { password } = c.req.valid('json')
    await userService.updatePassword(c.req.param('id'), password, caller)
    return c.json({ data: null, message: 'Password updated' })
  })
  .delete('/:id', async (c) => {
    const caller = c.get('user')
    await userService.delete(c.req.param('id'), caller)
    return c.json({ data: null, message: 'User deleted' })
  })
