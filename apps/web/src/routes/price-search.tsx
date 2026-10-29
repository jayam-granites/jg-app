import { createFileRoute } from '@tanstack/react-router'
import { PriceSearchPage } from '@/features/price-search/pages/price-search-page'

export const Route = createFileRoute('/price-search')({
  component: PriceSearchPage,
})
