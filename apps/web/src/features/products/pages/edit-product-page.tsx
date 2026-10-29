import { useParams, useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProductForm } from '../components/product-form'
import { useProduct, useUpdateProduct } from '../hooks/use-products'

export function EditProductPage() {
  const { id } = useParams({ from: '/products/$id/edit' })
  const productId = Number(id)
  const navigate = useNavigate()
  const { data: productRes, isLoading } = useProduct(productId)
  const updateProduct = useUpdateProduct()

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/products' })}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Product</h1>
          <p className="text-sm text-muted-foreground">{product.name}</p>
        </div>
      </div>

      <ProductForm
        mode="edit"
        isSaving={updateProduct.isPending}
        initialData={{
          name: product.name,
          categoryId: product.categoryId,
          description: product.description ?? '',
          hsnCode: product.hsnCode ?? '',
          lotNumber: product.lotNumber ?? '',
          variants: (product.variants ?? []).map((v: any) => ({
            id: v.id,
            skuCode: v.skuCode,
            unitId: v.unitId,
            secondaryUnitId: v.secondaryUnitId ?? null,
            attributes: (v.attributes ?? []).map((a: any) => ({
              id: a.id,
              attributeId: a.attributeId,
              attributeValueId: a.attributeValueId,
            })),
          })),
        }}
        onSave={(data) => {
          updateProduct.mutate(
            { id: productId, data: data as any },
            { onSuccess: () => navigate({ to: '/products' }) },
          )
        }}
      />
    </div>
  )
}
