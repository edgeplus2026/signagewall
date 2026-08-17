import {
  POWERBI_SECURE_LIFECYCLE_FIXTURES,
  POWERBI_SECURE_RESPONSIVE_FIXTURES,
} from './fixtures.js'
import {
  contentKey,
  nextPageIndex,
  reconcileLifecycle,
  retainLastKnownGood,
  snapshotView,
  viewportShape,
} from './runtime.js'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Power BI Secure fixture failed: ${message}`)
}

/**
 * Dependency-free focused checks. Kept out of the production entry point; CI or
 * an agent can compile this file and invoke the function with plain Node.
 */
export function runPowerBiSecureFixtureChecks(): void {
  for (const fixture of POWERBI_SECURE_RESPONSIVE_FIXTURES) {
    assert(
      viewportShape(fixture.viewport.width, fixture.viewport.height) ===
        fixture.expectedShape,
      `${fixture.name} responsive shape`,
    )
  }

  for (const fixture of POWERBI_SECURE_LIFECYCLE_FIXTURES) {
    const selected = retainLastKnownGood(
      fixture.incoming,
      fixture.retained,
      fixture.meta,
    )
    const view = snapshotView(selected, fixture.meta)
    assert(view.kind === fixture.expectedView, `${fixture.name} view`)
    const pageCount = view.kind === 'content' ? view.pages.length : 0
    assert(pageCount === fixture.expectedPageCount, `${fixture.name} pages`)
    if (fixture.expectedFreshness) {
      assert(
        view.kind === 'content' && view.freshness === fixture.expectedFreshness,
        `${fixture.name} freshness`,
      )
    }
  }

  const content = snapshotView(
    POWERBI_SECURE_RESPONSIVE_FIXTURES[0]?.payload ?? null,
    null,
  )
  assert(content.kind === 'content', 'lifecycle content fixture')
  if (content.kind !== 'content') return

  const inactive = {
    active: false,
    index: 2,
    contentKey: contentKey(content),
  }
  const activated = reconcileLifecycle(inactive, content, true)
  assert(activated.index === 0, 'activation restarts at page one')

  const visible = { ...activated, index: 2 }
  const deactivated = reconcileLifecycle(visible, content, false)
  assert(deactivated.index === 2, 'deactivation retains the current page')
  assert(
    [0, 1, 2, 0].every((expected, index, sequence) =>
      index === 0
        ? expected === 0
        : expected === nextPageIndex(sequence[index - 1] ?? 0, 3),
    ),
    'three-page pagination wraps',
  )

  const firstPage = content.payload.pages[0]
  assert(firstPage, 'signature rotation fixture has a page')
  const renewed = snapshotView(
    {
      ...content.payload,
      pages: [
        {
          ...firstPage,
          url: `${content.pages[0]}?expires=renewed`,
        },
        ...content.payload.pages.slice(1),
      ],
    },
    null,
  )
  assert(renewed.kind === 'content', 'renewed URL stays renderable')
  assert(
    contentKey(renewed) === contentKey(content),
    'rotating URL query does not reset slideshow identity',
  )
}
