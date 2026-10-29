import { createFileRoute } from '@tanstack/react-router'
import { EditProductPage } from '@/features/products/pages/edit-product-page'

export const Route = createFileRoute('/products/$id/edit')({
  component: EditProductPage,
})
