import { createNavigation } from 'next-intl/navigation'

import { routing } from './routing'

// Locale-aware drop-in replacements for Next's navigation APIs.
export const { Link, redirect, permanentRedirect, usePathname, useRouter, getPathname } =
  createNavigation(routing)
