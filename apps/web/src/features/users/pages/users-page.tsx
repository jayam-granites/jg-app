import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/shared/components/data-table'
import { PageLayout } from '@/shared/components/page-layout'
import { AppForm } from '@/components/forms/app-form'
import { UserSchema } from '@jg-app/validators'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { User } from '@jg-app/shared'
import { useUsers, useCreateUser } from '@/features/users/hooks/use-users'
import { formatDateTime } from '@/lib/date'

export function UsersPage() {
  const { data: response, isLoading } = useUsers()
  const mutation = useCreateUser()

  const columns: ColumnDef<User>[] = useMemo(
    () => [
      { accessorKey: 'name', header: 'Name' },
      { accessorKey: 'email', header: 'Email' },
      {
        accessorKey: 'createdAt',
        header: 'Created',
        cell: ({ getValue }) => formatDateTime(getValue() as string),
      },
    ],
    [],
  )

  return (
    <PageLayout
      title="Users"
      description="Manage user access and permissions"
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>All Users</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={(response?.data ?? []) as User[]}
              searchKey="name"
              isLoading={isLoading}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Create User</CardTitle>
          </CardHeader>
          <CardContent>
            <AppForm
              fields={[
                { name: 'name', label: 'Name', placeholder: 'John Doe' },
                { name: 'email', label: 'Email', type: 'email', placeholder: 'john@example.com' },
              ]}
              schema={UserSchema}
              onSubmit={(value) => mutation.mutate(value)}
              isSubmitting={mutation.isPending}
              submitLabel="Create User"
            />
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  )
}
