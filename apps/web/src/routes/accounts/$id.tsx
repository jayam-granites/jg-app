import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'

export const Route = createFileRoute('/accounts/$id')({
  component: AccountStatementPage,
})

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)
}

function formatDate(date: string) {
  return new Date(date).toLocaleString('en-IN')
}

function AccountStatementPage() {
  const { id } = Route.useParams()
  const accountId = Number(id)

  const { data: account } = useQuery({
    queryKey: ['account', accountId],
    queryFn: async () => {
      const res = await api.accounts[':id'].$get({ param: { id: String(accountId) } })
      return res.json()
    },
  })

  const { data: transactions = [] } = useQuery({
    queryKey: ['account-statement', accountId],
    queryFn: async () => {
      const res = await api.accounts[':id'].statement.$get({ param: { id: String(accountId) } })
      return res.json()
    },
  })

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/accounts">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">{account?.name || 'Account Statement'}</h1>
            <p className="text-sm text-muted-foreground">
              {account?.type} {account?.ownerTag ? `• ${account.ownerTag}` : ''}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Current Balance</p>
          <p className="text-2xl font-bold">{formatCurrency(Number(account?.currentBalance || 0))}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction Ledger</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-left">Date & Time</th>
                  <th className="p-2 text-left">Transaction Type</th>
                  <th className="p-2 text-left">Reference</th>
                  <th className="p-2 text-left">Note</th>
                  <th className="p-2 text-right">Amount</th>
                  <th className="p-2 text-right">Running Balance</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx: any) => {
                  const amount = Number(tx.amount)
                  const isCredit = amount > 0
                  return (
                    <tr key={tx.id} className="border-b">
                      <td className="p-2">{formatDate(tx.transactionDate)}</td>
                      <td className="p-2">{tx.type.replace('_', ' ')}</td>
                      <td className="p-2">{tx.referenceType || '-'} {tx.referenceId ? `#${tx.referenceId}` : ''}</td>
                      <td className="p-2">{tx.note || '-'}</td>
                      <td className={`p-2 text-right ${isCredit ? 'text-green-600' : amount < 0 ? 'text-red-600' : ''}`}>
                        {isCredit ? '+' : ''}{formatCurrency(amount)}
                      </td>
                      <td className="p-2 text-right font-medium">{formatCurrency(Number(tx.balanceAfter || 0))}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
