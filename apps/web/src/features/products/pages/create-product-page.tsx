import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProductForm } from '../components/product-form'
import { useCreateProduct } from '../hooks/use-create-product'

export function CreateProductPage() {
  const navigate = useNavigate()
  const createProduct = useCreateProduct()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/products' })}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Product</h1>
          <p className="text-sm text-muted-foreground">Add a new product with its variants and attributes</p>
        </div>
      </div>

      <ProductForm
        mode="create"
        isSaving={createProduct.isPending}
        onSave={(data) => {
          createProduct.mutate(data as any, {
            onSuccess: () => navigate({ to: '/products' }),
          })
        }}
      />
    </div>
  )
}
