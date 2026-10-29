import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Save } from 'lucide-react'
import { PageLayout } from '@/shared/components/page-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateCustomer } from '../hooks/use-customers'

export function CreateCustomerPage() {
  const navigate = useNavigate()
  const createCustomer = useCreateCustomer()
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState('')
  const [mobile, setMobile] = useState('')
  const [alternateMobile, setAlternateMobile] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [pincode, setPincode] = useState('')
  const [gstNumber, setGstNumber] = useState('')

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      await createCustomer.mutateAsync({
        name: name.trim(),
        mobile: mobile || undefined,
        alternateMobile: alternateMobile || undefined,
        address: address || undefined,
        city: city || undefined,
        state: state || undefined,
        pincode: pincode || undefined,
        gstNumber: gstNumber || undefined,
      } as never)
      navigate({ to: '/customers' })
    } catch (e: any) {
      alert(e?.message || 'Failed to save customer')
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageLayout title="New Customer" description="Add a new customer">
      <div className="space-y-6 max-w-2xl">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Customer name" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Mobile</Label>
            <Input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="Mobile number" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Alternate Mobile</Label>
            <Input value={alternateMobile} onChange={(e) => setAlternateMobile(e.target.value)} placeholder="Alternate mobile" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">GST Number</Label>
            <Input value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} placeholder="GSTIN" />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-semibold">Address</Label>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street address" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">City</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">State</Label>
            <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="State" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Pincode</Label>
            <Input value={pincode} onChange={(e) => setPincode(e.target.value)} placeholder="Pincode" />
          </div>
        </div>

        <div className="flex items-center justify-between border-t pt-4">
          <div />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate({ to: '/customers' })}>Cancel</Button>
            <Button onClick={handleSave} disabled={!name.trim() || saving}>
              <Save className="mr-1.5 h-4 w-4" /> {saving ? 'Saving...' : 'Save Customer'}
            </Button>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
