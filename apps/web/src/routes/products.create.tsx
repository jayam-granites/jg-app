import { createFileRoute } from '@tanstack/react-router'
import { CreateProductPage } from '@/features/products/pages/create-product-page'

export const Route = createFileRoute('/products/create')({
  component: CreateProductPage,
})
