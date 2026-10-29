import { useParams, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { useProduct } from '../hooks/use-products'
import { formatDateTime } from '@/lib/date'

export function ProductDetailPage() {
  const { id } = useParams({ from: '/products/$id' })
  const productId = Number(id)
  const navigate = useNavigate()
  const { data: productRes, isLoading } = useProduct(productId)

  const product = (productRes as any)?.data

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground">
        Loading...
      </div>
    )
  }

  if (!product) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/products' })}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Product not found</h1>
          </div>
        </div>
      </div>
    )
  }

  const variants = product.variants ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/products' })}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{product.name}</h1>
              <Badge variant={product.isActive ? 'default' : 'secondary'} className="rounded-md border-0">
                {product.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {variants.length} variant{variants.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <Button onClick={() => navigate({ to: `/products/${product.id}/edit` })}>
          <Pencil className="mr-2 h-4 w-4" /> Edit Product
        </Button>
      </div>

      {/* Product Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Product Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Category</p>
              <p className="text-sm mt-0.5">{product.category?.name ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">HSN Code</p>
              <p className="text-sm mt-0.5 font-mono">{product.hsnCode || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Lot Number</p>
              <p className="text-sm mt-0.5">{product.lotNumber || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Created</p>
              <p className="text-sm mt-0.5">{formatDateTime(product.createdAt)}</p>
            </div>
            {product.description && (
              <div className="col-span-full">
                <p className="text-xs text-muted-foreground font-medium">Description</p>
                <p className="text-sm mt-0.5">{product.description}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Variants */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Variants ({variants.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-9">SKU</TableHead>
                <TableHead className="h-9">Unit</TableHead>
                {variants.some((v: any) => v.secondaryUnitId) && (
                  <TableHead className="h-9">Secondary Unit</TableHead>
                )}
                <TableHead className="h-9">Attributes</TableHead>
                <TableHead className="h-9">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {variants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={variants.some((v: any) => v.secondaryUnitId) ? 5 : 4} className="h-20 text-center text-muted-foreground text-sm">
                    No variants
                  </TableCell>
                </TableRow>
              ) : (
                variants.map((v: any) => {
                  const attrLabels = (v.attributes ?? [])
                    .map((a: any) => {
                      const name = a.attribute?.name ?? ''
                      const value = a.attributeValue?.value ?? ''
                      return name && value ? `${name}: ${value}` : ''
                    })
                    .filter(Boolean)
                    .join(', ')
                  return (
                    <TableRow key={v.id} className={cn(!v.isActive && 'opacity-50')}>
                      <TableCell className="py-2 font-mono text-xs">{v.skuCode}</TableCell>
                      <TableCell className="py-2 text-sm">{v.unit?.code ?? '—'}</TableCell>
                      {variants.some((v: any) => v.secondaryUnitId) && (
                        <TableCell className="py-2 text-sm">
                          {v.secondaryUnit?.code ?? '—'}
                        </TableCell>
                      )}
                      <TableCell className="py-2 text-sm text-muted-foreground">{attrLabels || '—'}</TableCell>
                      <TableCell className="py-2">
                        <Badge
                          variant={v.isActive ? 'default' : 'secondary'}
                          className="rounded-md border-0 text-[10px]"
                        >
                          {v.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
