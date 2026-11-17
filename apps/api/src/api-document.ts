type RouteDefinition = {
  method: string
  path: string
}

const documentedMethods = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])

function openApiPath(path: string): string {
  return path
    .replace(/^\/api(?=\/|$)/, '')
    .replace(/:([A-Za-z0-9_]+)/g, '{$1}') || '/'
}

function tagForPath(path: string): string {
  const segment = path.split('/').filter(Boolean)[0]
  if (!segment) return 'General'
  return segment
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function operationId(method: string, path: string): string {
  const parts = path
    .split('/')
    .filter(Boolean)
    .map((part) => part.replace(/[{}]/g, ''))
    .map((part) => part.replace(/[^A-Za-z0-9]/g, ' '))
    .flatMap((part) => part.split(/\s+/).filter(Boolean))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))

  return `${method.toLowerCase()}${parts.join('') || 'Root'}`
}

export function createApiDocument(routes: RouteDefinition[]) {
  const paths: Record<string, Record<string, unknown>> = {}
  const operationIds = new Set<string>()

  for (const route of routes) {
    if (!documentedMethods.has(route.method) || !route.path.startsWith('/api/')) continue
    if (route.path.includes('*') || route.path === '/api/openapi.json' || route.path === '/api/reference') {
      continue
    }

    const path = openApiPath(route.path)
    const method = route.method.toLowerCase()
    const tag = tagForPath(path)
    const parameters = [...path.matchAll(/\{([^}]+)\}/g)].map(([, name]) => ({
      name,
      in: 'path' as const,
      required: true,
      schema: { type: 'string' as const },
    }))
    const responses: Record<string, unknown> = {
      '2XX': {
        description: 'Successful response. The response body is endpoint-specific JSON.',
        content: { 'application/json': { schema: {} } },
      },
      '4XX': {
        description: 'Request, validation, authorization, or not-found error.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: {
                  type: 'object',
                  properties: {
                    code: { type: 'string' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
      '5XX': {
        description: 'Unexpected server error.',
        content: { 'application/json': { schema: {} } },
      },
    }
    const baseOperationId = operationId(route.method, path)
    let uniqueOperationId = baseOperationId
    let suffix = 2
    while (operationIds.has(uniqueOperationId)) {
      uniqueOperationId = `${baseOperationId}${suffix++}`
    }
    operationIds.add(uniqueOperationId)

    const operation: Record<string, unknown> = {
      tags: [tag],
      summary: `${route.method} ${path}`,
      operationId: uniqueOperationId,
      description: 'Generated from the registered Hono route. Request and response JSON schemas are endpoint-specific.',
      ...(parameters.length > 0 && { parameters }),
      ...(['POST', 'PUT', 'PATCH'].includes(route.method) && {
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', additionalProperties: true },
            },
          },
        },
      }),
      ...(!(path === '/health') && {
        security: [{ sessionCookie: [] }],
      }),
      responses,
    }

    paths[path] ??= {}
    paths[path][method] = operation
  }

  return {
    openapi: '3.1.0',
    info: {
      title: 'Jayam Granites API',
      version: '1.0.0',
      description:
        'All endpoints except GET /health require an authenticated Better Auth session. ' +
        'Request and response schemas are not currently published by the route handlers, so JSON bodies are shown generically.',
    },
    servers: [{ url: '/api' }],
    tags: [...new Set(Object.keys(paths).map(tagForPath))].map((name) => ({ name })),
    paths,
    components: {
      securitySchemes: {
        sessionCookie: {
          type: 'apiKey',
          in: 'cookie',
          name: 'better-auth.session_token',
          description:
            'Default Better Auth session cookie. Secure deployments may use a __Secure- prefixed cookie name.',
        },
      },
    },
  }
}
