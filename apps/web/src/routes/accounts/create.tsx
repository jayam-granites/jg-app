import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useState } from 'react'

export const Route = createFileRoute('/accounts/create')({
  component: CreateAccountPage,
})

function CreateAccountPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    type: 'CASH',
    ownerTag: '',
    initialBalance: 0,
    isActive: true,
  })

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.accounts.$post({ json: data })
      return res.json()
    },
    onSuccess: () => {
      navigate({ to: '/accounts' })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate({ ...form, initialBalance: Number(form.initialBalance) })
  }

  return (
    <div className="max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Create Account</h1>
        <p className="text-sm text-muted-foreground">Add a new payment account</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Account Name</label>
              <input
                className="w-full rounded-md border px-3 py-2"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="e.g., Cash - Mohan Owned"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Method Type</label>
              <select
                className="w-full rounded-md border px-3 py-2"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="BANK_ACCOUNT">Bank Account</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Owner Tag</label>
              <input
                className="w-full rounded-md border px-3 py-2"
                value={form.ownerTag}
                onChange={(e) => setForm({ ...form, ownerTag: e.target.value })}
                placeholder="e.g., Mohan, Vijay, Company"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Initial Balance</label>
              <input
                type="number"
                className="w-full rounded-md border px-3 py-2"
                value={form.initialBalance}
                onChange={(e) => setForm({ ...form, initialBalance: Number(e.target.value) })}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={mutation.isPending}>
                Create Account
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate({ to: '/accounts' })}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
