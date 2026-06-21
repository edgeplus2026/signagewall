import * as React from 'react'

const MOBILE_BREAKPOINT = 768
const MOBILE_MEDIA_QUERY = `(max-width: ${String(MOBILE_BREAKPOINT - 1)}px)`
const LG_BREAKPOINT = 1024
const BELOW_LG_MEDIA_QUERY = `(max-width: ${String(LG_BREAKPOINT - 1)}px)`

function useMediaQuery(query: string) {
  const [matches, setMatches] = React.useState(
    () => window.matchMedia(query).matches,
  )

  React.useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => {
      setMatches(mql.matches)
    }
    mql.addEventListener('change', onChange)
    return () => {
      mql.removeEventListener('change', onChange)
    }
  }, [query])

  return matches
}

export function useIsMobile() {
  return useMediaQuery(MOBILE_MEDIA_QUERY)
}

export function useIsBelowLg() {
  return useMediaQuery(BELOW_LG_MEDIA_QUERY)
}
