import { useTranslation } from 'react-i18next'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useActiveOrganization,
  useOrganizationStore,
} from '@/features/organizations/store/organizationStore'

export function OrganizationSelect() {
  const { t } = useTranslation()
  const organizations = useOrganizationStore((state) => state.organizations)
  const activeOrganization = useActiveOrganization()
  const setActiveOrganization = useOrganizationStore((state) => state.setActiveOrganization)

  if (!activeOrganization) return null

  return (
    <Select
      value={activeOrganization.id}
      onValueChange={(value) => {
        setActiveOrganization(value)
      }}
    >
      <SelectTrigger className="w-56" aria-label={t('settings.profile.organization')}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {organizations.map((organization) => (
          <SelectItem key={organization.id} value={organization.id}>
            {organization.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
