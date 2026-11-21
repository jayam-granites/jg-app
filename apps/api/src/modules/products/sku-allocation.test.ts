import { describe, expect, it } from 'bun:test'
import { Prisma } from '@prisma/client'
import { allocateVariantSkus, withSkuRetry, type SkuStore } from './sku-allocation'

function memoryStore(initial: string[] = []) {
  const skus = new Set(initial)
  const store: SkuStore = {
    async findExistingSkus(prefixes) {
      return [...skus].filter((sku) => prefixes.some((prefix) => sku.startsWith(prefix)))
    },
  }
  return { store, skus }
}

const polished = [{ code: 'finish', name: 'Finish', value: 'Polished' }]

describe('allocateVariantSkus', () => {
  it('gives Paradiso Grey, Red and Pink distinct SKUs', async () => {
    const { store } = memoryStore()

    const results = await Promise.all(
      ['Paradiso Grey', 'Paradiso Red', 'Paradiso Pink'].map((productName) =>
        allocateVariantSkus({
          productName,
          variants: [{ skuCode: 'PAR-001', attributes: [] }],
          attributes: [polished],
          reserved: new Set(),
          store,
        }),
      ),
    )

    expect(results.map((result) => result.skus[0])).toEqual([
      'PAR-GRY-POL-001',
      'PAR-RED-POL-001',
      'PAR-PNK-POL-001',
    ])
  })

  it('reads existing SKUs from the database and advances the sequence', async () => {
    const { store } = memoryStore(['PAR-GRY-POL-001', 'PAR-GRY-POL-002'])

    const result = await allocateVariantSkus({
      productName: 'Paradiso Grey',
      variants: [{ skuCode: 'PAR-001' }],
      attributes: [polished],
      reserved: new Set(),
      store,
    })

    expect(result.skus).toEqual(['PAR-GRY-POL-003'])
  })

  it('does not reuse a SKU already attempted in the same request', async () => {
    const { store } = memoryStore()

    const result = await allocateVariantSkus({
      productName: 'Paradiso Grey',
      variants: [{ skuCode: 'PAR-GRY-POL-001' }],
      attributes: [polished],
      reserved: new Set(['PAR-GRY-POL-001']),
      store,
    })

    expect(result.skus).toEqual(['PAR-GRY-POL-002'])
  })

  it('keeps explicit bespoke SKUs unchanged', async () => {
    const { store } = memoryStore()

    const result = await allocateVariantSkus({
      productName: 'Paradiso Grey',
      variants: [{ id: 7, skuCode: 'CUSTOM-GREY' }],
      attributes: [polished],
      reserved: new Set(),
      store,
    })

    expect(result.skus).toEqual(['CUSTOM-GREY'])
    expect(result.generated).toEqual([])
  })
})

describe('withSkuRetry', () => {
  it('retries with a higher sequence after a duplicate-key error', async () => {
    const { store, skus } = memoryStore()
    const attempts: string[][] = []

    const saved = await withSkuRetry(async (reserved, record) => {
      const { skus: candidates } = await allocateVariantSkus({
        productName: 'Paradiso Grey',
        variants: [{ skuCode: 'PAR-GRY-POL-001' }],
        attributes: [polished],
        reserved,
        store,
      })
      record(candidates)
      attempts.push(candidates)

      if (attempts.length === 1) {
        // Another request won the race between allocation and insert.
        skus.add(candidates[0])
        throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
          meta: { target: ['sku_code'] },
        })
      }

      skus.add(candidates[0])
      return candidates
    })

    expect(attempts).toEqual([['PAR-GRY-POL-001'], ['PAR-GRY-POL-002']])
    expect(saved).toEqual(['PAR-GRY-POL-002'])
    // The competitor's SKU and our successful retry are both stored.
    expect(skus.size).toBe(2)
  })

  it('propagates non-unique errors without retrying', async () => {
    let calls = 0
    expect(
      withSkuRetry(async () => {
        calls++
        throw new Error('connection lost')
      }),
    ).rejects.toThrow('connection lost')
    await Bun.sleep(0)
    expect(calls).toBe(1)
  })
})
