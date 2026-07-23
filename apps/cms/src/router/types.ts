export interface RouteBreadcrumbHandle {
  labelKey: string
}

export interface RouteHandle {
  breadcrumb?: RouteBreadcrumbHandle | null
}
