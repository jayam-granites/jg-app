import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/accounts/$id/edit')({
  component: EditAccountPage,
})

function EditAccountPage() {
  const { id } = Route.useParams()
  const accountId = Number(id)
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    type: 'CASH',
    ownerTag: '',
    initialBalance: 0,
    isActive: true,
  })

  const { data: account } = useQuery({
    queryKey: ['account', accountId],
    queryFn: async () => {
      const res = await api.accounts[':id'].$get({ param: { id: String(accountId) } })
      return res.json()
    },
  })

  useEffect(() => {
    if (account) {
      setForm({
        name: account.name || '',
        type: account.type || 'CASH',
        ownerTag: account.ownerTag || '',
        initialBalance: Number(account.initialBalance || 0),
        isActive: account.isActive ?? true,
      })
    }
  }, [account])

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.accounts[':id'].$put({ param: { id: String(accountId) }, json: data })
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
        <h1 className="text-2xl font-semibold">Edit Account</h1>
        <p className="text-sm text-muted-foreground">Update account details</p>
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
                Update Account
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
