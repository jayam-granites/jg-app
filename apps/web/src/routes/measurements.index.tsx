import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { Plus, Loader2, Trash2, FileSpreadsheet, FileDown, Share2, Eye, ShoppingCart } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/shared/components/data-table'
import type { DataTableRowAction, DataTableBulkAction } from '@/shared/components/data-table'
import { PageLayout } from '@/shared/components/page-layout'
import { Button } from '@/components/ui/button'
import { useMeasurements, useCreateMeasurement, useDeleteMeasurement } from '@/features/measurements/hooks/use-measurements'
import { useConvertMeasurementToSale } from '@/features/measurements/hooks/use-convert-to-sale'
import { exportMeasurementToExcel, saveMeasurementPdf, shareMeasurementPdf, toMeasurementExport, buildMeasurementPdf } from '@/features/measurements/lib/export'
import { previewPdf } from '@/lib/pdf'
import { formatDateTime } from '@/lib/date'

type MeasurementRow = {
  id: number
  measurementNumber: string
  name: string
  slabCount: number
  createdAt: string
}

function MeasurementsListPage() {
  const navigate = useNavigate()
  const { data: measurementsRes, isLoading } = useMeasurements()
  const createMeasurement = useCreateMeasurement()
  const deleteMeasurement = useDeleteMeasurement()
  const { convert } = useConvertMeasurementToSale()
  const [creating, setCreating] = useState(false)

  const measurements = measurementsRes?.data ?? []

  const tableData: MeasurementRow[] = useMemo(() => {
    return measurements.map((m: any) => ({
      id: m.id,
      measurementNumber: m.measurementNumber,
      name: m.name,
      slabCount: m.slabs?.length ?? 0,
      createdAt: m.createdAt,
    }))
  }, [measurements])

  const rowActions: DataTableRowAction<MeasurementRow>[] = useMemo(
    () => [
      {
        label: 'Open',
        onClick: (item) => navigate({ to: '/measurements/$id', params: { id: String(item.id) } }),
      },
      {
        label: 'Convert to Sales',
        icon: ShoppingCart,
        onClick: (item) => {
          const measurement = measurements.find((m: any) => m.id === item.id)
          if (measurement) convert(measurement)
        },
      },
      {
        label: 'Export Excel',
        icon: FileSpreadsheet,
        onClick: async (item) => {
          const measurement = measurements.find((m: any) => m.id === item.id)
          if (!measurement) return
          try {
            await exportMeasurementToExcel(toMeasurementExport(measurement))
          } catch (error) {
            console.error(error)
            alert('Failed to export Excel file')
          }
        },
      },
      {
        label: 'Save PDF',
        icon: FileDown,
        onClick: (item) => {
          const measurement = measurements.find((m: any) => m.id === item.id)
          if (!measurement) return
          try {
            saveMeasurementPdf(toMeasurementExport(measurement))
          } catch (error) {
            console.error(error)
            alert('Failed to save PDF')
          }
        },
      },
      {
        label: 'Preview PDF',
        icon: Eye,
        onClick: (item) => {
          const measurement = measurements.find((m: any) => m.id === item.id)
          if (!measurement) return
          try {
            const doc = buildMeasurementPdf(toMeasurementExport(measurement))
            previewPdf(doc)
          } catch (error) {
            console.error(error)
            alert('Failed to preview PDF')
          }
        },
      },
      {
        label: 'Share PDF',
        icon: Share2,
        onClick: async (item) => {
          const measurement = measurements.find((m: any) => m.id === item.id)
          if (!measurement) return
          try {
            await shareMeasurementPdf(toMeasurementExport(measurement))
          } catch (error) {
            console.error(error)
            alert('Failed to share PDF')
          }
        },
      },
      {
        label: 'Delete',
        icon: Trash2,
        variant: 'destructive',
        onClick: (item) => {
          if (window.confirm(`Delete measurement ${item.measurementNumber}?`)) {
            deleteMeasurement.mutate(item.id)
          }
        },
      },
    ],
    [navigate, measurements, convert, deleteMeasurement],
  )

  const bulkActions: DataTableBulkAction<MeasurementRow>[] = useMemo(
    () => [
      {
        label: 'Delete',
        icon: Trash2,
        variant: 'destructive',
        onClick: (rows) => {
          if (window.confirm(`Delete ${rows.length} measurement(s)?`)) {
            for (const row of rows) {
              deleteMeasurement.mutate(row.id)
            }
          }
        },
      },
    ],
    [deleteMeasurement],
  )

  const columns: ColumnDef<MeasurementRow>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ getValue }) => <span className="text-sm font-medium">{getValue() as string}</span>,
      },
      {
        accessorKey: 'measurementNumber',
        header: 'Measurement ID',
        cell: ({ getValue }) => (
          <span className="font-mono text-sm text-muted-foreground">{getValue() as string}</span>
        ),
      },
      {
        accessorKey: 'slabCount',
        header: 'Slabs',
        cell: ({ getValue }) => <span className="text-sm">{getValue() as number}</span>,
      },
      {
        accessorKey: 'createdAt',
        header: 'Created',
        cell: ({ getValue }) => (
          <span className="text-sm text-muted-foreground">
            {formatDateTime(getValue() as string)}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: () => null,
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [],
  )

  const handleCreate = async () => {
    setCreating(true)
    createMeasurement.mutate(
      {},
      {
        onSuccess: (res: any) => {
          setCreating(false)
          navigate({ to: '/measurements/$id', params: { id: String(res.data.id) } })
        },
        onError: () => setCreating(false),
      },
    )
  }

  return (
    <PageLayout
      title="Measurements"
      description="Manage measurement sessions for slab tracking"
      action={
        <Button onClick={handleCreate} disabled={creating} className="rounded-lg shadow-sm">
          {creating ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>
          ) : (
            <><Plus className="mr-2 h-4 w-4" /> New Measurement</>
          )}
        </Button>
      }
    >
      <DataTable
        columns={columns}
        data={tableData}
        searchKey={{ id: 'name', placeholder: 'Search measurements...' }}
        rowActions={rowActions}
        bulkActions={bulkActions}
        isLoading={isLoading}
        onRowClick={(item) => navigate({ to: '/measurements/$id', params: { id: String(item.id) } })}
        emptyState={{
          title: 'No measurements yet',
          description: 'Create your first measurement to start tracking slabs',
        }}
      />
    </PageLayout>
  )
}

export const Route = createFileRoute('/measurements/')({
  component: MeasurementsListPage,
})