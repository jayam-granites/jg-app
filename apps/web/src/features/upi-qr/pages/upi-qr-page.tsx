import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { Check, Copy, Download, Pencil, Plus, QrCode, Trash2, X } from 'lucide-react'
import { PageLayout } from '@/shared/components/page-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  useCreateUpiProfile,
  useDeleteUpiProfile,
  useUpdateUpiProfile,
  useUpiProfiles,
  type UpiProfile,
} from '../hooks/use-upi-profiles'

const UPI_VPA_PATTERN = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/
const AMOUNT_PATTERN = /^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})?$/

type ProfileForm = {
  payeeName: string
  payeeVPA: string
  isDefault: boolean
}

const EMPTY_FORM: ProfileForm = {
  payeeName: '',
  payeeVPA: '',
  isDefault: false,
}

function formatRupees(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function UpiQrPage() {
  const profilesQuery = useUpiProfiles()
  const createProfile = useCreateUpiProfile()
  const updateProfile = useUpdateUpiProfile()
  const deleteProfile = useDeleteUpiProfile()
  const profiles = profilesQuery.data ?? []

  const [selectedProfileId, setSelectedProfileId] = useState('')
  const [amount, setAmount] = useState('')
  const [copied, setCopied] = useState(false)
  const qrCanvasRef = useRef<HTMLCanvasElement>(null)

  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<UpiProfile | null>(null)
  const [profileForm, setProfileForm] = useState<ProfileForm>(EMPTY_FORM)
  const [profileFormError, setProfileFormError] = useState('')
  const [profileToDelete, setProfileToDelete] = useState<UpiProfile | null>(null)
  const [deleteError, setDeleteError] = useState('')

  const selectedProfile = profiles.find((profile) => String(profile.id) === selectedProfileId)
  const amountValue = amount === '' ? 0 : Number(amount)
  const hasSpecificAmount = Number.isFinite(amountValue) && amountValue > 0

  const upiLink = useMemo(() => {
    if (!selectedProfile) return ''
    const amountParameter = hasSpecificAmount ? `&am=${amountValue.toFixed(2)}` : ''
    return `upi://pay?pa=${encodeURIComponent(selectedProfile.payeeVPA)}&pn=${encodeURIComponent(selectedProfile.payeeName)}${amountParameter}&cu=INR`
  }, [selectedProfile, amountValue, hasSpecificAmount])

  useEffect(() => {
    if (profiles.length === 0) {
      setSelectedProfileId('')
      return
    }
    if (!profiles.some((profile) => String(profile.id) === selectedProfileId)) {
      const defaultProfile = profiles.find((profile) => profile.isDefault) ?? profiles[0]
      setSelectedProfileId(String(defaultProfile.id))
    }
  }, [profiles, selectedProfileId])

  function openCreateDialog() {
    setEditingProfile(null)
    setProfileForm(EMPTY_FORM)
    setProfileFormError('')
    setProfileDialogOpen(true)
  }

  function openEditDialog(profile: UpiProfile) {
    setEditingProfile(profile)
    setProfileForm({
      payeeName: profile.payeeName,
      payeeVPA: profile.payeeVPA,
      isDefault: profile.isDefault,
    })
    setProfileFormError('')
    setProfileDialogOpen(true)
  }

  function closeProfileDialog(open: boolean) {
    setProfileDialogOpen(open)
    if (!open) {
      setEditingProfile(null)
      setProfileFormError('')
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const payeeName = profileForm.payeeName.trim()
    const payeeVPA = profileForm.payeeVPA.trim()
    if (!payeeName) {
      setProfileFormError('Payee name is required.')
      return
    }
    if (!UPI_VPA_PATTERN.test(payeeVPA)) {
      setProfileFormError('Enter a valid UPI ID, such as merchant@okicici.')
      return
    }

    setProfileFormError('')
    try {
      const data = { payeeName, payeeVPA, isDefault: profileForm.isDefault }
      const savedProfile = editingProfile
        ? await updateProfile.mutateAsync({ id: editingProfile.id, data })
        : await createProfile.mutateAsync(data)
      if (savedProfile.isDefault || !selectedProfileId) {
        setSelectedProfileId(String(savedProfile.id))
      }
      closeProfileDialog(false)
    } catch (error) {
      setProfileFormError(error instanceof Error ? error.message : 'Failed to save UPI profile.')
    }
  }

  async function confirmDeleteProfile() {
    if (!profileToDelete) return
    setDeleteError('')
    try {
      await deleteProfile.mutateAsync(profileToDelete.id)
      setProfileToDelete(null)
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete UPI profile.')
    }
  }

  function downloadQr() {
    const canvas = qrCanvasRef.current
    if (!canvas || !selectedProfile) return
    const link = document.createElement('a')
    const safeName = selectedProfile.payeeName.trim().replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '')
    link.download = `upi-qr-${safeName || selectedProfile.id}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  async function copyUpiLink() {
    if (!upiLink) return
    try {
      await navigator.clipboard.writeText(upiLink)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error(error)
      alert('Could not copy the UPI link. Check clipboard permissions and try again.')
    }
  }

  const isSavingProfile = createProfile.isPending || updateProfile.isPending

  return (
    <PageLayout title="UPI QR Codes" description="Generate payment QR codes and manage saved UPI accounts.">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="size-5" /> Dynamic UPI QR Generator
            </CardTitle>
            <CardDescription>Choose an account and optionally set a fixed payment amount.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="upi-profile-select">UPI Account</Label>
                <Select
                  value={selectedProfileId}
                  onValueChange={setSelectedProfileId}
                  disabled={profiles.length === 0}
                >
                  <SelectTrigger id="upi-profile-select">
                    <SelectValue placeholder={profilesQuery.isLoading ? 'Loading accounts...' : 'Select UPI account'} />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((profile) => (
                      <SelectItem key={profile.id} value={String(profile.id)}>
                        {profile.payeeName} ({profile.payeeVPA})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="upi-amount">Amount (₹ INR)</Label>
                <div className="flex gap-2">
                  <Input
                    id="upi-amount"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    placeholder="Any amount"
                    value={amount}
                    onChange={(event) => {
                      const nextAmount = event.target.value
                      if (nextAmount === '' || AMOUNT_PATTERN.test(nextAmount)) setAmount(nextAmount)
                    }}
                    disabled={!selectedProfile}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Clear amount"
                    title="Clear amount"
                    onClick={() => setAmount('')}
                    disabled={!amount}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Leave blank for an open-amount QR.</p>
              </div>
            </div>

            {profilesQuery.isError && (
              <p role="alert" className="text-sm text-destructive">
                {profilesQuery.error instanceof Error ? profilesQuery.error.message : 'Failed to load UPI accounts.'}
              </p>
            )}

            <div className="flex flex-col items-center gap-4 rounded-xl border bg-muted/20 p-5 text-center">
              <div className="flex min-h-64 w-full max-w-sm flex-col items-center justify-center gap-4 rounded-lg bg-card p-5 shadow-xs">
                {upiLink && selectedProfile ? (
                  <>
                    <QRCodeCanvas
                      ref={qrCanvasRef}
                      value={upiLink}
                      size={220}
                      level="M"
                      includeMargin
                      aria-label={`UPI payment QR for ${selectedProfile.payeeName}`}
                    />
                    <div className="flex flex-col gap-1">
                      <p className="font-semibold">{selectedProfile.payeeName}</p>
                      <p className="text-sm text-muted-foreground">{selectedProfile.payeeVPA}</p>
                      <p className="text-sm font-medium">
                        {hasSpecificAmount ? formatRupees(amountValue) : 'Open amount'}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col gap-2 text-muted-foreground">
                    <QrCode className="mx-auto size-10 opacity-50" />
                    <p className="text-sm">
                      {profiles.length === 0 ? 'Add a UPI account to generate a QR code.' : 'Select a UPI account to generate a QR code.'}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <Button onClick={downloadQr} disabled={!upiLink}>
                  <Download className="mr-2 size-4" /> Download QR (PNG)
                </Button>
                <Button variant="outline" onClick={copyUpiLink} disabled={!upiLink}>
                  {copied ? <Check className="mr-2 size-4" /> : <Copy className="mr-2 size-4" />}
                  {copied ? 'Copied' : 'Copy UPI Link'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3">
            <div className="flex flex-col gap-1.5">
              <CardTitle>Saved UPI Accounts</CardTitle>
              <CardDescription>Manage the accounts available to the QR generator.</CardDescription>
            </div>
            <Button onClick={openCreateDialog} className="shrink-0">
              <Plus className="mr-2 size-4" /> Add New UPI
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payee Name</TableHead>
                    <TableHead>UPI ID</TableHead>
                    <TableHead>Default</TableHead>
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profilesQuery.isLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        Loading UPI accounts...
                      </TableCell>
                    </TableRow>
                  ) : profilesQuery.isError ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-destructive">
                        Failed to load UPI accounts.
                      </TableCell>
                    </TableRow>
                  ) : profiles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        No UPI accounts saved yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    profiles.map((profile) => (
                      <TableRow key={profile.id}>
                        <TableCell className="font-medium">{profile.payeeName}</TableCell>
                        <TableCell className="font-mono text-sm">{profile.payeeVPA}</TableCell>
                        <TableCell>
                          {profile.isDefault ? <Badge>Default</Badge> : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Edit ${profile.payeeName}`}
                              title="Edit UPI profile"
                              onClick={() => openEditDialog(profile)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Delete ${profile.payeeName}`}
                              title="Delete UPI profile"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                setDeleteError('')
                                setProfileToDelete(profile)
                              }}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={profileDialogOpen} onOpenChange={closeProfileDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingProfile ? 'Edit UPI Account' : 'Add New UPI Account'}</DialogTitle>
            <DialogDescription>Enter the name and UPI ID used to receive payments.</DialogDescription>
          </DialogHeader>
          <form onSubmit={saveProfile} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="payee-name">Payee Name</Label>
              <Input
                id="payee-name"
                required
                maxLength={200}
                value={profileForm.payeeName}
                onChange={(event) => setProfileForm((current) => ({ ...current, payeeName: event.target.value }))}
                placeholder="Jayam Granites"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="payee-vpa">UPI ID</Label>
              <Input
                id="payee-vpa"
                required
                maxLength={323}
                pattern="[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}"
                value={profileForm.payeeVPA}
                onChange={(event) => setProfileForm((current) => ({ ...current, payeeVPA: event.target.value }))}
                placeholder="merchant@okicici"
                aria-describedby="payee-vpa-help"
              />
              <p id="payee-vpa-help" className="text-xs text-muted-foreground">
                Format: name@bank
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="upi-is-default"
                checked={profileForm.isDefault}
                onCheckedChange={(checked) => setProfileForm((current) => ({ ...current, isDefault: checked === true }))}
              />
              <Label htmlFor="upi-is-default">Set as Default</Label>
            </div>
            {profileFormError && <p role="alert" className="text-sm text-destructive">{profileFormError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => closeProfileDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSavingProfile}>
                {isSavingProfile ? 'Saving...' : editingProfile ? 'Save Changes' : 'Add UPI'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={profileToDelete !== null} onOpenChange={(open) => { if (!open) setProfileToDelete(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete UPI account?</DialogTitle>
            <DialogDescription>
              {profileToDelete
                ? `${profileToDelete.payeeName} (${profileToDelete.payeeVPA}) will be removed.`
                : 'This UPI account will be removed.'}
            </DialogDescription>
          </DialogHeader>
          {deleteError && <p role="alert" className="text-sm text-destructive">{deleteError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setProfileToDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDeleteProfile} disabled={deleteProfile.isPending}>
              {deleteProfile.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
