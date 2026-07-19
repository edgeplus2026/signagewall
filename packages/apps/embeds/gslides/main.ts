import type { GslidesPayload } from '../../src/gslides/payload.js'
import { connectToHost } from '../_shared/host-bridge.js'
import '../_shared/base.css'
import './style.css'

const root = document.getElementById('app')

let slides: string[] = []
let index = 0
let timer: ReturnType<typeof setInterval> | undefined
let img: HTMLImageElement | null = null

function stop(): void {
  if (timer !== undefined) {
    clearInterval(timer)
    timer = undefined
  }
}

function show(i: number): void {
  const url = slides[i]
  if (img && url) img.src = url
}

function setup(
  config: Record<string, unknown>,
  data: GslidesPayload | null,
): void {
  if (!root) return

  const all = data?.slides ?? []
  const max =
    typeof config.maxSlides === 'number' && config.maxSlides > 0
      ? config.maxSlides
      : all.length
  slides = all.slice(0, max)
  const seconds =
    typeof config.slideSeconds === 'number' && config.slideSeconds > 0
      ? config.slideSeconds
      : 8

  stop()

  if (slides.length === 0) {
    root.innerHTML = '<div class="gsl"><p class="gsl-empty">Loading…</p></div>'
    img = null
    return
  }

  // Warm the browser cache so each swap is instant (no flash between slides).
  for (const url of slides) {
    const preload = new Image()
    preload.src = url
  }

  const wrap = document.createElement('div')
  wrap.className = 'gsl'
  img = document.createElement('img')
  img.className = 'gsl-img'
  img.alt = ''
  wrap.append(img)
  root.replaceChildren(wrap)

  index = 0
  show(0)
  if (slides.length > 1) {
    timer = setInterval(() => {
      index = (index + 1) % slides.length
      show(index)
    }, seconds * 1000)
  }
}

connectToHost<Record<string, unknown>, GslidesPayload>(({ config, data }) => {
  setup(config, data)
})
