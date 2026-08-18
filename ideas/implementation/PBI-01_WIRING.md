> **Nacrt, ne odluka.** Ništa ovde nije obavezujuće — vidi [ideas/README.md](../README.md).
> **A draft, not a decision.** Nothing here is binding — see [ideas/README.md](../README.md).

# PBI-01 integration note

Status: provider and shared INT-02 wiring complete; real-tenant smoke test remains blocked by missing tenant/capacity credentials.

## Provider exports

Import from `./providers/powerbi-api`:

- `listPowerBiWorkspaces(accessToken, query, signal?)`
- `listPowerBiReports(accessToken, workspaceId, query, signal?)`
- `listPowerBiReportPages(accessToken, workspaceId, reportId, query, signal?)`
- `POWER_BI_SNAPSHOT_DELEGATED_SCOPES`

The provider always calls `https://api.powerbi.com/v1.0/myorg`; it never accepts
a tenant URL/id. Microsoft therefore limits results to workspaces granted to the
delegated user. Continuation links are followed only on the exact same API path.

## Exact `ConnectionsService` cases

Nested report/page selectors need parent ids in addition to the operator's
free-text search. Do not pack them into `query`, and do not trust parent ids from
saved config without the existing per-instance connection ownership check.

Add a typed optional browse context:

```ts
interface RemoteBrowseContext {
  workspaceId?: string;
  reportId?: string;
  signal?: AbortSignal;
}
```

Then import the helpers and add these exact cases to
`ConnectionsService.browseRemoteOptions` after `assertOwned` and
`resolveConnection` have completed:

```ts
case 'powerbi-workspaces':
  this.assertProvider(connection.provider, ConnectionProvider.MICROSOFT)
  return listPowerBiWorkspaces(connection.accessToken, query, context.signal)

case 'powerbi-reports':
  this.assertProvider(connection.provider, ConnectionProvider.MICROSOFT)
  if (!context.workspaceId) {
    throw BusinessException.badRequest('Select a Power BI workspace first.')
  }
  return listPowerBiReports(
    connection.accessToken,
    context.workspaceId,
    query,
    context.signal,
  )

case 'powerbi-pages':
  this.assertProvider(connection.provider, ConnectionProvider.MICROSOFT)
  if (!context.workspaceId || !context.reportId) {
    throw BusinessException.badRequest('Select a Power BI workspace and report first.')
  }
  return listPowerBiReportPages(
    connection.accessToken,
    context.workspaceId,
    context.reportId,
    query,
    context.signal,
  )
```

The controller now accepts `workspaceId` and `reportId`. Generic
`remoteParams` metadata maps each child picker to the selected parent
`{id,label}` value and sends only its id. The form clears `report` when the
workspace changes, clears `page` when workspace/report changes, and disables a
child picker until all parents exist.

Suggested source names are exactly:

- `powerbi-workspaces`
- `powerbi-reports`
- `powerbi-pages`

Do not make ids part of `remoteSource`; the current route treats it as a switch
key, and dynamic source strings make authorization and telemetry harder to
audit.

## OAuth scopes

Use a mutable copy of `POWER_BI_SNAPSHOT_DELEGATED_SCOPES` on the future
`powerbi-secure` OAuth descriptor:

```ts
scopes: [...POWER_BI_SNAPSHOT_DELEGATED_SCOPES];
```

These are the read-only union required by workspace listing and ExportToFile.
Do not request `Workspace.ReadWrite.All`, `Report.ReadWrite.All`,
`Dataset.ReadWrite.All`, any admin `Tenant.*` scope, or Microsoft Graph data
scopes for this app. The Microsoft v2 token must target the Power BI resource;
mixing Graph and Power BI data scopes in one authorization request is not a
valid multi-resource token strategy. The existing provider's `/me` label lookup
may fail with a Power BI-audience token and safely falls back to “Microsoft
account”; use ID-token claims later if a better label is required.

Official operation references:

- https://learn.microsoft.com/en-us/rest/api/power-bi/groups/get-groups
- https://learn.microsoft.com/en-us/rest/api/power-bi/reports/get-reports-in-group
- https://learn.microsoft.com/en-us/rest/api/power-bi/reports/get-pages-in-group
- https://learn.microsoft.com/en-us/rest/api/power-bi/reports/export-to-file-in-group
- https://learn.microsoft.com/en-us/power-bi/developer/embedded/export-to

## Capacity gate

`isOnDedicatedCapacity: false` is labelled as unsupported for snapshot mode.
`true` is only a necessary-condition signal, not proof: ExportToFile does not
support Premium Per User (PPU), all related semantic models must also be on
supported capacity, and tenant export settings can still block the call. Keep
the “export must be verified” label until INT-02 performs a real export-compatible
tenant test.

## Required owner identity before PBI-03

`ResolvedConnection` and `ConnectionsService.resolveConnection` now return
`organizationId` and `appInstanceId` from the persisted connection document.
Tests prove:

1. both ids come from the persisted connection, never connector config;
2. an instance cannot resolve another instance's connection through an
   organization-scoped CMS path;
3. private object keys use the resolved organization + app-instance + connection
   ids;
4. neither owner id is accepted as an arbitrary caller override.

The Wave 3 ownership blocker is closed. Organization ids remain forbidden in
app config and Power BI exports use only the separate private R2 bucket.
