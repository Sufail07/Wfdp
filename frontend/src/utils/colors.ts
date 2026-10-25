/** Resolve CSS custom properties to real colour strings for ECharts.
 * ECharts cannot resolve var(--token) references, so we read computed
 * values from the document element once per theme change.
 */

let cache: Record<string, string> | null = null

function getRootStyle(): CSSStyleDeclaration {
  return document.documentElement.style || getComputedStyle(document.documentElement)
}

export function resolveColor(token: string): string {
  if (!cache) {
    const style = getRootStyle()
    cache = {}
    // Read all --* custom properties from the root
    for (let i = 0; i < style.length; i++) {
      const name = style[i]
      if (name.startsWith('--')) {
        cache[name] = style.getPropertyValue(name).trim()
      }
    }
  }

  const value = cache[token]
  if (value) return value

  // Fallback: try reading directly from computed style
  const style = getRootStyle()
  const direct = style.getPropertyValue(token).trim()
  if (direct) {
    cache[token] = direct
    return direct
  }

  // Last resort: return the token as-is (ECharts may interpret it)
  return token
}

export function resolveColors(tokens: string[]): string[] {
  return tokens.map(resolveColor)
}

export function clearColorCache(): void {
  cache = null
}
