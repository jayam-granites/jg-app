import { createFileRoute } from '@tanstack/react-router'
import { ProductsPage } from '@/features/products/pages/products-page'

export const Route = createFileRoute('/products/')({
  component: ProductsPage,
})
