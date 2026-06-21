const DEFAULT_BREADCRUMB_LABEL_MAX_LENGTH = 30

export function truncateBreadcrumbLabel(
  label: string,
  maxLength = DEFAULT_BREADCRUMB_LABEL_MAX_LENGTH,
): string {
  if (label.length <= maxLength) {
    return label
  }

  return `${label.slice(0, maxLength).trimEnd()}…`
}

export function getBreadcrumbLabelDisplay(label: string) {
  const displayLabel = truncateBreadcrumbLabel(label)

  return {
    displayLabel,
    title: displayLabel === label ? undefined : label,
  }
}
