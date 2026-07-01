import { useEffect } from 'react'

const FOCUS_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[data-focusable="true"]',
].join(',')

const getFocusable = () =>
  Array.from(document.querySelectorAll(FOCUS_SELECTOR)).filter((element) => {
    const rect = element.getBoundingClientRect()
    const style = window.getComputedStyle(element)
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
  })

const scoreCandidate = (currentRect, candidateRect, direction) => {
  const currentX = currentRect.left + currentRect.width / 2
  const currentY = currentRect.top + currentRect.height / 2
  const candidateX = candidateRect.left + candidateRect.width / 2
  const candidateY = candidateRect.top + candidateRect.height / 2
  const dx = candidateX - currentX
  const dy = candidateY - currentY

  if (direction === 'ArrowRight' && dx <= 4) return Infinity
  if (direction === 'ArrowLeft' && dx >= -4) return Infinity
  if (direction === 'ArrowDown' && dy <= 4) return Infinity
  if (direction === 'ArrowUp' && dy >= -4) return Infinity

  const primary = direction === 'ArrowRight' || direction === 'ArrowLeft' ? Math.abs(dx) : Math.abs(dy)
  const secondary = direction === 'ArrowRight' || direction === 'ArrowLeft' ? Math.abs(dy) : Math.abs(dx)
  return primary * 1.6 + secondary
}

export default function useKeyboardNavigation({ enabled = true } = {}) {
  useEffect(() => {
    if (!enabled) return undefined

    const onKeyDown = (event) => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(event.key)) return

      const tagName = document.activeElement?.tagName?.toLowerCase()
      if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') return

      const focusable = getFocusable()
      if (!focusable.length) return

      if (event.key === 'Enter' && document.activeElement?.matches(FOCUS_SELECTOR)) {
        document.activeElement.click()
        return
      }

      const activeElement = focusable.includes(document.activeElement) ? document.activeElement : focusable[0]
      const activeRect = activeElement.getBoundingClientRect()
      const ranked = focusable
        .filter((element) => element !== activeElement)
        .map((element) => ({
          element,
          score: scoreCandidate(activeRect, element.getBoundingClientRect(), event.key),
        }))
        .sort((a, b) => a.score - b.score)

      const next = ranked.find((item) => Number.isFinite(item.score))?.element
      if (next) {
        event.preventDefault()
        next.focus({ preventScroll: true })
        next.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled])
}
