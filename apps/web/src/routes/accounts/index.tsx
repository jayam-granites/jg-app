import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, CreditCard } from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute('/accounts/')({
  component: AccountsPage,
})

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)
}

function AccountsPage() {
  const queryClient = useQueryClient()
  const [showAdjustment, setShowAdjustment] = useState(false)
  const [adjustForm, setAdjustForm] = useState({ accountId: 0, type: 'CREDIT', amount: 0, note: '' })

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await api.accounts.$get()
      return res.json()
    },
  })

  const adjustmentMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.accounts.adjustment.$post({ json: data })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      setShowAdjustment(false)
      setAdjustForm({ accountId: 0, type: 'CREDIT', amount: 0, note: '' })
    },
  })

  const cashAccounts = accounts.filter((a: any) => a.type === 'CASH')
  const upiAccounts = accounts.filter((a: any) => a.type === 'UPI')
  const bankAccounts = accounts.filter((a: any) => a.type === 'BANK_ACCOUNT')

  const totalCash = cashAccounts.reduce((sum: number, a: any) => sum + Number(a.currentBalance || 0), 0)
  const totalUpi = upiAccounts.reduce((sum: number, a: any) => sum + Number(a.currentBalance || 0), 0)
  const totalBank = bankAccounts.reduce((sum: number, a: any) => sum + Number(a.currentBalance || 0), 0)
  const grandTotal = totalCash + totalUpi + totalBank

  const handleAdjustment = (e: React.FormEvent) => {
    e.preventDefault()
    adjustmentMutation.mutate({ accountId: adjustForm.accountId, type: adjustForm.type, amount: Number(adjustForm.amount), note: adjustForm.note })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Accounts</h1>
          <p className="text-sm text-muted-foreground">Manage payment accounts and balances</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setShowAdjustment(true)}>
            Manual Adjustment
          </Button>
          <Button asChild>
            <Link to="/accounts/create">
              <Plus className="mr-2 h-4 w-4" />
              Add Account
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Cash in Hand</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalCash)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total UPI Balances</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalUpi)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Bank Balances</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalBank)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Grand Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(grandTotal)}</div>
          </CardContent>
        </Card>
      </div>

      {showAdjustment && (
        <Card>
          <CardHeader>
            <CardTitle>Manual Balance Adjustment</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdjustment} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <select
                className="rounded-md border px-3 py-2"
                value={adjustForm.accountId}
                onChange={(e) => setAdjustForm({ ...adjustForm, accountId: Number(e.target.value) })}
                required
              >
                <option value={0}>Select Account</option>
                {accounts.map((a: any) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.type})
                  </option>
                ))}
              </select>
              <select
                className="rounded-md border px-3 py-2"
                value={adjustForm.type}
                onChange={(e) => setAdjustForm({ ...adjustForm, type: e.target.value })}
              >
                <option value="CREDIT">Credit (+)</option>
                <option value="DEBIT">Debit (-)</option>
              </select>
              <input
                type="number"
                className="rounded-md border px-3 py-2"
                placeholder="Amount"
                value={adjustForm.amount || ''}
                onChange={(e) => setAdjustForm({ ...adjustForm, amount: Number(e.target.value) })}
                required
              />
              <input
                className="rounded-md border px-3 py-2"
                placeholder="Reason/Note"
                value={adjustForm.note}
                onChange={(e) => setAdjustForm({ ...adjustForm, note: e.target.value })}
              />
              <div className="flex gap-2">
                <Button type="submit" disabled={adjustmentMutation.isPending}>
                  Apply
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowAdjustment(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-left">Account Name</th>
                  <th className="p-2 text-left">Type</th>
                  <th className="p-2 text-left">Owner</th>
                  <th className="p-2 text-right">Initial Balance</th>
                  <th className="p-2 text-right">Current Balance</th>
                  <th className="p-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account: any) => (
                  <tr key={account.id} className="border-b">
                    <td className="p-2 flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      {account.name}
                    </td>
                    <td className="p-2">{account.type}</td>
                    <td className="p-2">{account.ownerTag || '-'}</td>
                    <td className="p-2 text-right">{formatCurrency(Number(account.initialBalance || 0))}</td>
                    <td className="p-2 text-right font-medium">{formatCurrency(Number(account.currentBalance || 0))}</td>
                    <td className="p-2 text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to="/accounts/$id" params={{ id: String(account.id) }}>
                          Statement
                        </Link>
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <Link to="/accounts/$id/edit" params={{ id: String(account.id) }}>
                          Edit
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
