import { describe, expect, it } from 'bun:test'
import { createApiDocument } from './api-document'

describe('createApiDocument', () => {
  it('documents registered operations and their path parameters', () => {
    const document = createApiDocument([
      { method: 'GET', path: '/api/expenses/:id' },
      { method: 'POST', path: '/api/expenses' },
      { method: 'ALL', path: '/api/auth/*' },
      { method: 'GET', path: '/api/openapi.json' },
    ])

    expect(document.paths['/expenses/{id}']).toBeDefined()
    expect(JSON.stringify(document.paths['/expenses/{id}'])).toContain('"name":"id"')
    expect(document.paths['/expenses']).toBeDefined()
    expect(JSON.stringify(document.paths['/expenses'])).toContain('"2XX"')
    expect(JSON.stringify(document.paths)).not.toContain('/auth')
    expect(JSON.stringify(document.paths)).not.toContain('/openapi.json')
  })

  it('documents health as unauthenticated and other operations as session-protected', () => {
    const document = createApiDocument([
      { method: 'GET', path: '/api/health' },
      { method: 'GET', path: '/api/accounts' },
    ])
    const json = JSON.stringify(document)

    expect(json).toContain('"sessionCookie"')
    expect(document.paths['/health']).toBeDefined()
    expect(JSON.stringify(document.paths['/health'])).not.toContain('"security"')
  })
})
