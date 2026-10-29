import { useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { PageLayout } from '@/shared/components/page-layout'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/shared/components/data-table/data-table'
import { useCustomers } from '../hooks/use-customers'

export function CustomersPage() {
  const navigate = useNavigate()
  const { data: res } = useCustomers()
  const data = useMemo(() => (res as any)?.data ?? [], [res])

  const columns = useMemo(
    () => [
      { accessorKey: 'name', header: 'Name' },
      { accessorKey: 'mobile', header: 'Mobile' },
      { accessorKey: 'city', header: 'City' },
      { accessorKey: 'gstNumber', header: 'GST' },
    ],
    [],
  )

  return (
    <PageLayout
      title="Customers"
      description="Manage customers"
      action={
        <Button size="sm" className="rounded-lg" onClick={() => navigate({ to: '/customers/create' })}>
          <Plus className="mr-1.5 h-4 w-4" /> New Customer
        </Button>
      }
    >
      <DataTable columns={columns} data={data} />
    </PageLayout>
  )
}
