import { createFileRoute } from '@tanstack/react-router'
import { UpiQrPage } from '@/features/upi-qr/pages/upi-qr-page'

export const Route = createFileRoute('/qr-codes')({
  component: UpiQrPage,
})
