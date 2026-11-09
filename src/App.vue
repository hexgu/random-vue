<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import PortGenerator from './components/PortGenerator.vue'
import FoodPicker from './components/FoodPicker.vue'
import { createSpring, prefersReducedMotion } from './lib/spring'

type Tab = 'port' | 'food'
type Theme = 'light' | 'dark'

const TABS = [
  { id: 'port' as Tab, label: '端口生成器' },
  { id: 'food' as Tab, label: '今天吃点啥' },
]
const TAB_ORDER: Tab[] = TABS.map((t) => t.id)

const tab = ref<Tab>('port')
const theme = ref<Theme>('dark')

/* ------------------------------ 主题 ------------------------------ */
function applyTheme(next: Theme) {
  theme.value = next
  document.documentElement.dataset.theme = next
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', next === 'dark' ? '#000000' : '#f5f5f7')
  try {
    localStorage.setItem('theme', next)
  } catch {
    /* 隐私模式下存储可能被禁用，忽略 */
  }
}

function toggleTheme() {
  applyTheme(theme.value === 'dark' ? 'light' : 'dark')
}

/* --------------------------- 顶栏滚动状态 --------------------------- */
const scrolled = ref(false)
function onScroll() {
  scrolled.value = window.scrollY > 6
}

/* --------------------- 分段控件（弹性滑块） --------------------- */
const segEl = ref<HTMLElement | null>(null)
const segButtons = ref<HTMLElement[]>([])
const thumbX = ref(3)
const thumbW = ref(0)
const thumbTop = ref(3)
const thumbH = ref(26)

/* 用临界阻尼弹簧（damping 1.0）驱动滑块的水平位置与宽度 */
const springX = createSpring(3, {
  damping: 1,
  response: 0.32,
  onUpdate: (v) => (thumbX.value = v),
})
const springW = createSpring(0, {
  damping: 1,
  response: 0.32,
  onUpdate: (v) => (thumbW.value = v),
})

let ro: ResizeObserver | null = null
let mq: MediaQueryList | null = null

function setSegButton(el: Element | null, index: number) {
  if (el) segButtons.value[index] = el as HTMLElement
}

function measureTarget() {
  const seg = segEl.value
  const btn = segButtons.value[TAB_ORDER.indexOf(tab.value)]
  if (!seg || !btn) return null
  const sr = seg.getBoundingClientRect()
  const br = btn.getBoundingClientRect()
  return { x: br.left - sr.left, w: br.width, top: br.top - sr.top, h: br.height }
}

function updateThumb(animate: boolean) {
  const t = measureTarget()
  if (!t) return
  thumbTop.value = t.top
  thumbH.value = t.h
  if (!animate || prefersReducedMotion()) {
    springX.jumpTo(t.x)
    springW.jumpTo(t.w)
  } else {
    springX.setTarget(t.x)
    springW.setTarget(t.w)
  }
}

function selectTab(next: Tab) {
  if (tab.value === next) return
  tab.value = next
}

function onKeydown(e: KeyboardEvent) {
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
  e.preventDefault()
  const i = TAB_ORDER.indexOf(tab.value)
  const delta = e.key === 'ArrowRight' ? 1 : -1
  const next = TAB_ORDER[(i + delta + TAB_ORDER.length) % TAB_ORDER.length]
  selectTab(next)
  nextTick(() => segButtons.value[TAB_ORDER.indexOf(next)]?.focus())
}

const thumbStyle = computed(() => ({
  transform: `translate3d(${thumbX.value}px, ${thumbTop.value}px, 0)`,
  width: `${thumbW.value}px`,
  height: `${thumbH.value}px`,
}))

watch(tab, () => nextTick(() => updateThumb(true)))

/* ------------------------------ 生命周期 ------------------------------ */
onMounted(() => {
  // 初始化主题（读取本地偏好 / 跟随系统）
  let saved: Theme | null = null
  try {
    saved = localStorage.getItem('theme') as Theme | null
  } catch {
    saved = null
  }
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true
  applyTheme(saved === 'light' || saved === 'dark' ? saved : prefersDark ? 'dark' : 'light')

  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()

  // 初始化分段滑块
  nextTick(() => updateThumb(false))
  if (typeof ResizeObserver !== 'undefined' && segEl.value) {
    ro = new ResizeObserver(() => updateThumb(false))
    ro.observe(segEl.value)
  }
  if (document.fonts?.ready) document.fonts.ready.then(() => updateThumb(false))

  mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  mq.addEventListener?.('change', () => updateThumb(false))
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  ro?.disconnect()
  springX.stop()
  springW.stop()
})
</script>

<template>
  <div class="app">
    <header class="topbar" :class="{ 'is-scrolled': scrolled }">
      <div class="topbar-inner">
        <div class="brand">
          <span class="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
              <circle cx="8.5" cy="8.5" r="1.25" fill="currentColor" stroke="none" />
              <circle cx="12" cy="12" r="1.25" fill="currentColor" stroke="none" />
              <circle cx="15.5" cy="15.5" r="1.25" fill="currentColor" stroke="none" />
            </svg>
          </span>
          <span class="brand-name">随机小站</span>
        </div>

        <div
          ref="segEl"
          class="segmented"
          role="tablist"
          aria-label="功能切换"
          @keydown="onKeydown"
        >
          <span class="seg-thumb" :style="thumbStyle" aria-hidden="true"></span>
          <button
            v-for="(t, i) in TABS"
            :key="t.id"
            :ref="(el) => setSegButton(el as Element | null, i)"
            class="seg-item"
            type="button"
            role="tab"
            :id="`tab-${t.id}`"
            :aria-controls="`panel-${t.id}`"
            :aria-selected="tab === t.id"
            :tabindex="tab === t.id ? 0 : -1"
            @click="selectTab(t.id)"
          >
            {{ t.label }}
          </button>
        </div>

        <div class="theme-slot">
          <button
            class="icon-btn theme-toggle"
            :class="{ 'is-dark': theme === 'dark' }"
            type="button"
            :aria-label="theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'"
            :title="theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'"
            @click="toggleTheme"
          >
            <svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
              <circle cx="12" cy="12" r="4.2" />
              <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6" />
            </svg>
            <svg class="icon-moon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.7 14.6A8.6 8.6 0 0 1 9.4 3.3a8.5 8.5 0 1 0 11.3 11.3Z" />
            </svg>
          </button>
        </div>
      </div>
    </header>

    <main class="content">
      <PortGenerator v-show="tab === 'port'" />
      <FoodPicker v-show="tab === 'food'" />
    </main>

    <footer class="site-footer">
      <p>
        随机数由
        <a href="https://www.random.org/" target="_blank" rel="noopener noreferrer">random.org</a>
        提供，经 Cloudflare Pages Functions 服务端代理请求。
      </p>
      <p class="muted">
        当 random.org 暂时不可用时，会自动降级为运行环境本地加密随机（crypto.getRandomValues），并在结果处明确标注。
      </p>
    </footer>
  </div>
</template>
