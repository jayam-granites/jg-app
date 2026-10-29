import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useCustomers, useCreateCustomer } from '@/features/customers/hooks/use-customers'

type MeasurementForSale = {
  id: number
  measurementNumber?: string
  name?: string
  phone?: string | null
  address?: string | null
}

export function useConvertMeasurementToSale() {
  const navigate = useNavigate()
  const { data: customersRes } = useCustomers()
  const createCustomer = useCreateCustomer()
  const [convertingId, setConvertingId] = useState<number | null>(null)

  async function convert(measurement: MeasurementForSale) {
    setConvertingId(measurement.id)
    try {
      const customers = customersRes?.data ?? []
      const phone = measurement.phone?.trim()
      const name = measurement.name?.trim()

      let customer = customers.find((c: any) => {
        if (phone && c.mobile) return c.mobile === phone
        if (name) return String(c.name).toLowerCase() === name.toLowerCase()
        return false
      })

      if (!customer) {
        const res: any = await createCustomer.mutateAsync({
          name: name || `Customer ${measurement.measurementNumber ?? measurement.id}`,
          mobile: phone || undefined,
          address: measurement.address?.trim() || undefined,
        })
        customer = res?.data
      }

      if (!customer?.id) throw new Error('Failed to prepare customer')

      navigate({
        to: '/invoices/create',
        search: {
          customerId: Number(customer.id),
          measurementId: Number(measurement.id),
        },
      })
    } catch (error: any) {
      alert(error?.message || 'Failed to convert measurement to sale')
    } finally {
      setConvertingId(null)
    }
  }

  return { convert, convertingId, isConverting: convertingId !== null }
}
