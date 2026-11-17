import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import {
  Building2,
  Contact,
  FileCheck2,
  Landmark,
  Pencil,
  Save,
  Settings2,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { PageLayout } from '@/shared/components/page-layout'
import {
  useCompanyProfile,
  useDeleteSystemConfiguration,
  useSaveSystemConfiguration,
  useSystemConfigurations,
  useUpdateCompanyProfile,
  type CompanyProfileUpdate,
  type ConfigurationInput,
  type ConfigurationType,
  type SystemConfiguration,
} from '../hooks/use-settings'

type SettingsSection = 'company' | 'contact' | 'tax' | 'bank' | 'system'
type ProfileDraft = CompanyProfileUpdate
type ConfigurationDraft = Omit<ConfigurationInput, 'options' | 'category' | 'description'> & {
  optionsText: string
  category: string
  description: string
}

const sections: { id: SettingsSection; label: string; icon: typeof Building2 }[] = [
  { id: 'company', label: 'Company Details', icon: Building2 },
  { id: 'contact', label: 'Contact Information', icon: Contact },
  { id: 'tax', label: 'Tax & Compliance', icon: FileCheck2 },
  { id: 'bank', label: 'UPI & Bank Details', icon: Landmark },
  { id: 'system', label: 'System Configurations', icon: Settings2 },
]

const emptyConfiguration: ConfigurationDraft = {
  configKey: '',
  configLabel: '',
  configValue: '',
  dataType: 'string',
  optionsText: '',
  category: 'General',
  description: '',
}

function Field({
  label,
  htmlFor,
  description,
  children,
}: {
  label: string
  htmlFor?: string
  description?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  )
}

function imageDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Unable to read the selected image'))
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Unable to read the selected image'))
        return
      }
      resolve(reader.result)
    }
    reader.readAsDataURL(file)
  })
}

function imageFileIsSupported(file: File) {
  return ['image/png', 'image/jpeg', 'image/webp'].includes(file.type)
}

function parseOptions(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separator = line.indexOf('|')
      if (separator < 0) return { label: line, value: line }
      return {
        label: line.slice(0, separator).trim(),
        value: line.slice(separator + 1).trim(),
      }
    })
}

function optionText(configuration: SystemConfiguration) {
  return (configuration.options ?? [])
    .map((option) => `${option.label} | ${option.value}`)
    .join('\n')
}

function ProfileImageUpload({
  label,
  value,
  onChange,
  onError,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  onError: (message: string) => void
}) {
  const inputId = label.toLowerCase().replaceAll(' ', '-')
  const handleFile = async (file?: File) => {
    if (!file) return
    if (!imageFileIsSupported(file)) {
      onError('Choose a PNG, JPEG, or WebP image.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      onError('Image must be 2 MB or smaller.')
      return
    }
    try {
      onChange(await imageDataUrl(file))
      onError('')
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Unable to read the selected image')
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      {value ? (
        <img src={value} alt={label} className="size-20 rounded-md border bg-background object-contain p-1" />
      ) : (
        <div className="flex size-20 items-center justify-center rounded-md border border-dashed text-muted-foreground">
          <Upload aria-hidden="true" />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          id={inputId}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="max-w-64"
          onChange={(event) => void handleFile(event.currentTarget.files?.[0])}
        />
        {value && (
          <Button type="button" variant="outline" size="sm" onClick={() => onChange('')}>
            <X data-icon="inline-start" />
            Remove
          </Button>
        )}
      </div>
    </div>
  )
}

export function SettingsPage() {
  const [section, setSection] = useState<SettingsSection>('company')
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>({})
  const [profileError, setProfileError] = useState('')
  const [profileMessage, setProfileMessage] = useState('')
  const [configurationDraft, setConfigurationDraft] = useState<ConfigurationDraft>(emptyConfiguration)
  const [editingConfiguration, setEditingConfiguration] = useState<SystemConfiguration | null>(null)
  const [configurationError, setConfigurationError] = useState('')
  const [configurationMessage, setConfigurationMessage] = useState('')
  const profileQuery = useCompanyProfile()
  const configurationQuery = useSystemConfigurations()
  const updateProfile = useUpdateCompanyProfile()
  const saveConfiguration = useSaveSystemConfiguration()
  const deleteConfiguration = useDeleteSystemConfiguration()
  const profile = profileQuery.data?.data
  const configurations = configurationQuery.data?.data ?? []

  useEffect(() => {
    if (!profile) return
    setProfileDraft({
      companyName: profile.companyName ?? '',
      address: profile.address ?? '',
      logoUrl: profile.logoUrl ?? '',
      website: profile.website ?? '',
      primaryPhone: profile.primaryPhone ?? '',
      secondaryPhone: profile.secondaryPhone ?? '',
      email: profile.email ?? '',
      gstNumber: profile.gstNumber ?? '',
      panNumber: profile.panNumber ?? '',
      tanNumber: profile.tanNumber ?? '',
      bankName: profile.bankName ?? '',
      accountHolderName: profile.accountHolderName ?? '',
      accountNumber: profile.accountNumber ?? '',
      ifscCode: profile.ifscCode ?? '',
      branch: profile.branch ?? '',
      upiId: profile.upiId ?? '',
      upiQrUrl: profile.upiQrUrl ?? '',
    })
  }, [profile])

  const setProfileField = (field: keyof CompanyProfileUpdate, value: string) => {
    setProfileDraft((current) => ({ ...current, [field]: value }))
    setProfileError('')
    setProfileMessage('')
  }

  const handleProfileSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setProfileError('')
    setProfileMessage('')
    updateProfile.mutate(profileDraft, {
      onSuccess: () => setProfileMessage('Company settings saved.'),
      onError: (error) => setProfileError(error.message),
    })
  }

  const changeConfigurationField = <K extends keyof ConfigurationDraft>(
    key: K,
    value: ConfigurationDraft[K],
  ) => {
    setConfigurationDraft((current) => ({ ...current, [key]: value }))
    setConfigurationError('')
    setConfigurationMessage('')
  }

  const resetConfigurationForm = () => {
    setEditingConfiguration(null)
    setConfigurationDraft(emptyConfiguration)
    setConfigurationError('')
    setConfigurationMessage('')
  }

  const editConfiguration = (configuration: SystemConfiguration) => {
    setEditingConfiguration(configuration)
    setConfigurationDraft({
      configKey: configuration.configKey,
      configLabel: configuration.configLabel,
      configValue: configuration.configValue,
      dataType: configuration.dataType,
      optionsText: optionText(configuration),
      category: configuration.category,
      description: configuration.description ?? '',
    })
    setConfigurationError('')
    setConfigurationMessage('')
  }

  const handleConfigurationSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const input: ConfigurationInput = {
      configKey: configurationDraft.configKey.trim(),
      configLabel: configurationDraft.configLabel.trim(),
      configValue: configurationDraft.configValue,
      dataType: configurationDraft.dataType,
      options: configurationDraft.dataType === 'select' ? parseOptions(configurationDraft.optionsText) : [],
      category: configurationDraft.category.trim() || 'General',
      description: configurationDraft.description.trim(),
    }
    setConfigurationError('')
    setConfigurationMessage('')
    saveConfiguration.mutate(
      { ...input, ...(editingConfiguration ? { id: editingConfiguration.id } : {}) },
      {
        onSuccess: () => {
          resetConfigurationForm()
          setConfigurationMessage(editingConfiguration ? 'Configuration updated.' : 'Configuration created.')
        },
        onError: (error) => setConfigurationError(error.message),
      },
    )
  }

  const renderProfileForm = (children: ReactNode) => (
    <form className="flex flex-col gap-6" onSubmit={handleProfileSave}>
      {children}
      {profileError && <p role="alert" className="text-sm text-destructive">{profileError}</p>}
      {profileMessage && <p role="status" className="text-sm text-muted-foreground">{profileMessage}</p>}
      <div>
        <Button type="submit" disabled={updateProfile.isPending || profileQuery.isLoading}>
          <Save data-icon="inline-start" />
          {updateProfile.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  )

  const renderContent = () => {
    if (section !== 'system' && profileQuery.isLoading) return <p className="text-sm text-muted-foreground">Loading company profile…</p>
    if (section !== 'system' && profileQuery.error) {
      return <p role="alert" className="text-sm text-destructive">{profileQuery.error.message}</p>
    }

    switch (section) {
      case 'company':
        return renderProfileForm(
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Company name" htmlFor="company-name">
              <Input id="company-name" required value={profileDraft.companyName ?? ''} onChange={(event) => setProfileField('companyName', event.target.value)} />
            </Field>
            <Field label="Website" htmlFor="company-website">
              <Input id="company-website" type="url" placeholder="https://example.com" value={profileDraft.website ?? ''} onChange={(event) => setProfileField('website', event.target.value)} />
            </Field>
            <div className="md:col-span-2">
              <Field label="Address" htmlFor="company-address">
                <Textarea id="company-address" value={profileDraft.address ?? ''} onChange={(event) => setProfileField('address', event.target.value)} />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Company logo" description="PNG, JPEG, or WebP; maximum 2 MB.">
                <ProfileImageUpload
                  label="Company logo"
                  value={profileDraft.logoUrl ?? ''}
                  onChange={(value) => setProfileField('logoUrl', value)}
                  onError={setProfileError}
                />
              </Field>
            </div>
          </div>,
        )
      case 'contact':
        return renderProfileForm(
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Primary phone" htmlFor="primary-phone">
              <Input id="primary-phone" type="tel" value={profileDraft.primaryPhone ?? ''} onChange={(event) => setProfileField('primaryPhone', event.target.value)} />
            </Field>
            <Field label="Secondary phone" htmlFor="secondary-phone">
              <Input id="secondary-phone" type="tel" value={profileDraft.secondaryPhone ?? ''} onChange={(event) => setProfileField('secondaryPhone', event.target.value)} />
            </Field>
            <Field label="Primary email" htmlFor="company-email">
              <Input id="company-email" type="email" value={profileDraft.email ?? ''} onChange={(event) => setProfileField('email', event.target.value)} />
            </Field>
          </div>,
        )
      case 'tax':
        return renderProfileForm(
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="GST number" htmlFor="gst-number" description="15-character Indian GSTIN.">
              <Input id="gst-number" maxLength={15} className="uppercase" value={profileDraft.gstNumber ?? ''} onChange={(event) => setProfileField('gstNumber', event.target.value.toUpperCase())} />
            </Field>
            <Field label="PAN" htmlFor="pan-number" description="Optional; format ABCDE1234F.">
              <Input id="pan-number" maxLength={10} className="uppercase" value={profileDraft.panNumber ?? ''} onChange={(event) => setProfileField('panNumber', event.target.value.toUpperCase())} />
            </Field>
            <Field label="TAN" htmlFor="tan-number" description="Optional; format ABCD12345E.">
              <Input id="tan-number" maxLength={10} className="uppercase" value={profileDraft.tanNumber ?? ''} onChange={(event) => setProfileField('tanNumber', event.target.value.toUpperCase())} />
            </Field>
          </div>,
        )
      case 'bank':
        return renderProfileForm(
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Bank name" htmlFor="bank-name">
              <Input id="bank-name" value={profileDraft.bankName ?? ''} onChange={(event) => setProfileField('bankName', event.target.value)} />
            </Field>
            <Field label="Account holder name" htmlFor="account-holder-name">
              <Input id="account-holder-name" value={profileDraft.accountHolderName ?? ''} onChange={(event) => setProfileField('accountHolderName', event.target.value)} />
            </Field>
            <Field label="Account number" htmlFor="account-number">
              <Input id="account-number" inputMode="numeric" value={profileDraft.accountNumber ?? ''} onChange={(event) => setProfileField('accountNumber', event.target.value)} />
            </Field>
            <Field label="IFSC code" htmlFor="ifsc-code" description="11-character Indian bank branch code.">
              <Input id="ifsc-code" maxLength={11} className="uppercase" value={profileDraft.ifscCode ?? ''} onChange={(event) => setProfileField('ifscCode', event.target.value.toUpperCase())} />
            </Field>
            <Field label="Branch" htmlFor="bank-branch">
              <Input id="bank-branch" value={profileDraft.branch ?? ''} onChange={(event) => setProfileField('branch', event.target.value)} />
            </Field>
            <Field label="UPI ID" htmlFor="upi-id">
              <Input id="upi-id" value={profileDraft.upiId ?? ''} onChange={(event) => setProfileField('upiId', event.target.value)} />
            </Field>
            <div className="md:col-span-2">
              <Field label="UPI QR code" description="Upload a PNG, JPEG, or WebP QR code; maximum 2 MB.">
                <ProfileImageUpload
                  label="UPI QR code"
                  value={profileDraft.upiQrUrl ?? ''}
                  onChange={(value) => setProfileField('upiQrUrl', value)}
                  onError={setProfileError}
                />
              </Field>
            </div>
          </div>,
        )
      case 'system':
        return (
          <div className="flex flex-col gap-6">
            <form className="flex flex-col gap-5 rounded-lg border p-4" onSubmit={handleConfigurationSave}>
              <div>
                <h3 className="font-semibold">{editingConfiguration ? 'Edit configuration' : 'Add configuration'}</h3>
                <p className="text-sm text-muted-foreground">Add typed application settings without changing the database schema.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Configuration key" htmlFor="configuration-key">
                  <Input id="configuration-key" required pattern="[a-z][a-z0-9_]{1,99}" placeholder="default_currency" value={configurationDraft.configKey} onChange={(event) => changeConfigurationField('configKey', event.target.value)} />
                </Field>
                <Field label="Display name" htmlFor="configuration-label">
                  <Input id="configuration-label" required value={configurationDraft.configLabel} onChange={(event) => changeConfigurationField('configLabel', event.target.value)} />
                </Field>
                <Field label="Category" htmlFor="configuration-category">
                  <Input id="configuration-category" value={configurationDraft.category ?? ''} onChange={(event) => changeConfigurationField('category', event.target.value)} />
                </Field>
                <Field label="Data type" htmlFor="configuration-type">
                  <Select value={configurationDraft.dataType} onValueChange={(value) => changeConfigurationField('dataType', value as ConfigurationType)}>
                    <SelectTrigger id="configuration-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {(['string', 'number', 'boolean', 'select', 'json'] as ConfigurationType[]).map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                {configurationDraft.dataType === 'boolean' ? (
                  <Field label="Value" htmlFor="configuration-value">
                    <Select value={configurationDraft.configValue || 'false'} onValueChange={(value) => changeConfigurationField('configValue', value)}>
                      <SelectTrigger id="configuration-value"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="true">Enabled</SelectItem>
                          <SelectItem value="false">Disabled</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                ) : configurationDraft.dataType === 'select' && parseOptions(configurationDraft.optionsText).length > 0 ? (
                  <Field label="Value" htmlFor="configuration-value">
                    <Select
                      value={configurationDraft.configValue || parseOptions(configurationDraft.optionsText)[0]?.value}
                      onValueChange={(value) => changeConfigurationField('configValue', value)}
                    >
                      <SelectTrigger id="configuration-value"><SelectValue placeholder="Choose a value" /></SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {parseOptions(configurationDraft.optionsText).map((option) => (
                            <SelectItem key={`${option.label}-${option.value}`} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                ) : configurationDraft.dataType === 'json' ? (
                  <Field label="Value" htmlFor="configuration-value">
                    <Textarea
                      id="configuration-value"
                      required
                      value={configurationDraft.configValue}
                      onChange={(event) => changeConfigurationField('configValue', event.target.value)}
                    />
                  </Field>
                ) : (
                  <Field label="Value" htmlFor="configuration-value">
                    <Input
                      id="configuration-value"
                      type={configurationDraft.dataType === 'number' ? 'number' : 'text'}
                      step={configurationDraft.dataType === 'number' ? 'any' : undefined}
                      required
                      value={configurationDraft.configValue}
                      onChange={(event) => changeConfigurationField('configValue', event.target.value)}
                    />
                  </Field>
                )}
                {configurationDraft.dataType === 'select' && (
                  <div className="md:col-span-2">
                    <Field label="Options" htmlFor="configuration-options" description="One option per line. Use “Label | value” to set a distinct display label.">
                      <Textarea id="configuration-options" required value={configurationDraft.optionsText} onChange={(event) => changeConfigurationField('optionsText', event.target.value)} />
                    </Field>
                  </div>
                )}
                <div className="md:col-span-2">
                  <Field label="Description" htmlFor="configuration-description">
                    <Textarea id="configuration-description" value={configurationDraft.description ?? ''} onChange={(event) => changeConfigurationField('description', event.target.value)} />
                  </Field>
                </div>
              </div>
              {configurationError && <p role="alert" className="text-sm text-destructive">{configurationError}</p>}
              {configurationMessage && <p role="status" className="text-sm text-muted-foreground">{configurationMessage}</p>}
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={saveConfiguration.isPending}>
                  <Save data-icon="inline-start" />
                  {saveConfiguration.isPending ? 'Saving…' : editingConfiguration ? 'Save configuration' : 'Add configuration'}
                </Button>
                {editingConfiguration && (
                  <Button type="button" variant="outline" onClick={resetConfigurationForm}>
                    <X data-icon="inline-start" />
                    Cancel
                  </Button>
                )}
              </div>
            </form>

            <Card>
              <CardHeader>
                <CardTitle>Configurations</CardTitle>
                <CardDescription>Global settings stored by unique key and data type.</CardDescription>
              </CardHeader>
              <CardContent>
                {configurationQuery.isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading configurations…</p>
                ) : configurationQuery.error ? (
                  <p role="alert" className="text-sm text-destructive">{configurationQuery.error.message}</p>
                ) : configurations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No configurations have been added.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Setting</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Value</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {configurations.map((configuration) => (
                          <TableRow key={configuration.id}>
                            <TableCell>
                              <div className="font-medium">{configuration.configLabel}</div>
                              <code className="text-xs text-muted-foreground">{configuration.configKey}</code>
                            </TableCell>
                            <TableCell>{configuration.dataType}</TableCell>
                            <TableCell className="max-w-56 truncate">{configuration.configValue}</TableCell>
                            <TableCell>{configuration.category}</TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" size="icon" aria-label={`Edit ${configuration.configLabel}`} onClick={() => editConfiguration(configuration)}>
                                  <Pencil />
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  aria-label={`Delete ${configuration.configLabel}`}
                                  disabled={deleteConfiguration.isPending}
                                  onClick={() => {
                                    if (!window.confirm(`Delete “${configuration.configLabel}”?`)) return
                                    deleteConfiguration.mutate(configuration.id, {
                                      onError: (error) => setConfigurationError(error.message),
                                    })
                                  }}
                                >
                                  <Trash2 />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )
    }
  }

  const activeSection = sections.find((item) => item.id === section)!

  return (
    <PageLayout title="Profile settings" description="Manage company details and global application settings.">
      <div className="grid items-start gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-6">
          <nav aria-label="Settings sections" className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:flex lg:flex-col">
            {sections.map((item) => (
              <Button
                key={item.id}
                type="button"
                variant={item.id === section ? 'secondary' : 'ghost'}
                className="justify-start"
                aria-current={item.id === section ? 'page' : undefined}
                onClick={() => setSection(item.id)}
              >
                <item.icon data-icon="inline-start" />
                <span className="truncate">{item.label}</span>
              </Button>
            ))}
          </nav>
        </aside>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <activeSection.icon aria-hidden="true" />
              </div>
              <div>
                <CardTitle>{activeSection.label}</CardTitle>
                <CardDescription>
                  {section === 'system'
                    ? 'Create and manage extensible application configuration values.'
                    : 'Review and update your organization profile.'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>{renderContent()}</CardContent>
        </Card>
      </div>
    </PageLayout>
  )
}
