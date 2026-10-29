import { Hono } from 'hono'
import { vValidator } from '@hono/valibot-validator'
import { CreateCategorySchema, UpdateCategorySchema, CreateUnitSchema, UpdateUnitSchema, CreateAttributeSchema, UpdateAttributeSchema, LinkCategoryAttributesSchema } from '@jg-app/validators'
import { mastersService } from './masters.service'
import type { CategoryType } from '@prisma/client'

export const mastersRoutes = new Hono()
  .get('/options', async (c) => {
    const group = c.req.query('group')
    const options = await mastersService.getLookupOptions(group)
    return c.json({ data: options })
  })
  .get('/settings', async (c) => {
    const settings = await mastersService.getSettings()
    return c.json({ data: settings })
  })
  .get('/categories', async (c) => {
    const type = c.req.query('type') as CategoryType | undefined
    const categories = await mastersService.getCategories(type)
    return c.json({ data: categories })
  })
  .post('/categories', vValidator('json', CreateCategorySchema), async (c) => {
    const data = c.req.valid('json')
    const category = await mastersService.createCategory(data)
    return c.json({ data: category }, 201)
  })
  .put('/categories/:id', vValidator('json', UpdateCategorySchema), async (c) => {
    const id = Number(c.req.param('id'))
    const data = c.req.valid('json')
    const category = await mastersService.updateCategory(id, data)
    return c.json({ data: category })
  })
  .get('/units', async (c) => {
    const units = await mastersService.getUnits()
    return c.json({ data: units })
  })
  .post('/units', vValidator('json', CreateUnitSchema), async (c) => {
    const data = c.req.valid('json')
    const unit = await mastersService.createUnit(data)
    return c.json({ data: unit }, 201)
  })
  .put('/units/:id', vValidator('json', UpdateUnitSchema), async (c) => {
    const id = Number(c.req.param('id'))
    const data = c.req.valid('json')
    const unit = await mastersService.updateUnit(id, data)
    return c.json({ data: unit })
  })
  .get('/attributes', async (c) => {
    const attributes = await mastersService.getAttributes()
    return c.json({ data: attributes })
  })
  .get('/attribute-values', async (c) => {
    const attributeId = c.req.query('attributeId')
    const values = await mastersService.getAttributeValues(
      attributeId ? Number(attributeId) : undefined,
    )
    return c.json({ data: values })
  })
  .post('/attributes', vValidator('json', CreateAttributeSchema), async (c) => {
    const data = c.req.valid('json')
    const attribute = await mastersService.createAttribute(data)
    return c.json({ data: attribute }, 201)
  })
  .put('/attributes/:id', vValidator('json', UpdateAttributeSchema), async (c) => {
    const id = Number(c.req.param('id'))
    const data = c.req.valid('json')
    const attribute = await mastersService.updateAttribute(id, data)
    return c.json({ data: attribute })
  })
  .get('/categories/:id/attributes', async (c) => {
    const id = Number(c.req.param('id'))
    const attributes = await mastersService.getCategoryAttributes(id)
    return c.json({ data: attributes })
  })
  .put('/categories/:id/attributes', vValidator('json', LinkCategoryAttributesSchema), async (c) => {
    const id = Number(c.req.param('id'))
    const data = c.req.valid('json')
    const result = await mastersService.linkCategoryAttributes(id, data.attributes)
    return c.json({ data: result })
  })
