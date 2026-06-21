import type { TFunction } from 'i18next'
import { z } from 'zod'

const NAME_MIN = 2

export const createOrganizationSchema = (t: TFunction) =>
  z.object({
    name: z.string().min(NAME_MIN, t('validation.nameMin', { min: NAME_MIN })),
  })

export type OrganizationSchema = z.infer<ReturnType<typeof createOrganizationSchema>>
