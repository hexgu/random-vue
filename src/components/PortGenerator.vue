<script setup lang="ts">
import { computed, ref } from 'vue'
import { describeSource, fetchRandom, type SourceMeta } from '../composables/useRandom'
import { PORT_MAX, PORT_MIN, lookupKnownPort } from '../data/knownPorts'

const count = ref(5)
const minPort = ref(PORT_MIN)
const maxPort = ref(PORT_MAX)
const unique = ref(true)
const sortAsc = ref(true)

const ports = ref<number[]>([])
const loading = ref(false)
const error = ref('')
const meta = ref<SourceMeta | null>(null)
const copiedKey = ref<string | null>(null)

const sourceInfo = computed(() => describeSource(meta.value))
const quotaText = computed(() => {
  const left = meta.value?.quota?.requestsLeft
  return typeof left === 'number' ? `random.org 剩余请求 ${left.toLocaleString()}` : ''
})
const rangeSize = computed(() => Math.max(0, maxPort.value - minPort.value + 1))

function sanitizeInt(value: unknown, fallback: number): number {
  const n = Math.trunc(Number(value))
  return Number.isFinite(n) ? n : fallback
}

function clampPorts() {
  minPort.value = Math.min(PORT_MAX, Math.max(PORT_MIN, sanitizeInt(minPort.value, PORT_MIN)))
  maxPort.value = Math.min(PORT_MAX, Math.max(PORT_MIN, sanitizeInt(maxPort.value, PORT_MAX)))
}

function usePreset(n: number) {
  count.value = n
}

async function generate() {
  error.value = ''
  clampPorts()
  if (minPort.value > maxPort.value) {
    error.value = '起始端口不能大于结束端口'
    return
  }
  const n = sanitizeInt(count.value, 5)
  if (n < 1 || n > 100) {
    error.value = '生成数量需在 1 ~ 100 之间'
    return
  }
  if (unique.value && rangeSize.value < n) {
    error.value = '端口范围太小，无法生成这么多不重复的端口'
    return
  }

  loading.value = true
  try {
    const data = await fetchRandom({
      n,
      min: minPort.value,
      max: maxPort.value,
      unique: unique.value,
    })
    const nums = (data.numbers ?? []).slice()
    if (sortAsc.value) nums.sort((a, b) => a - b)
    ports.value = nums
    meta.value = {
      source: data.source,
      transport: data.transport,
      quota: data.quota,
      reason: data.reason,
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    loading.value = false
  }
}

async function copy(text: string, key: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    try {
      document.execCommand('copy')
    } catch {
      /* 忽略：部分环境不支持 */
    }
    document.body.removeChild(ta)
  }
  copiedKey.value = key
  window.setTimeout(() => {
    if (copiedKey.value === key) copiedKey.value = null
  }, 1400)
}

function copyAll() {
  if (ports.value.length) copy(ports.value.join('\n'), 'all')
}
</script>

<template>
  <section class="panel" id="panel-port" role="tabpanel" aria-labelledby="tab-port">
    <header class="panel-head">
      <p class="eyebrow">随机工具</p>
      <h1 class="panel-title">Linux 随机端口生成器</h1>
      <p class="panel-sub">
        在 <strong>1024 ~ 49151</strong> 的注册端口 / 用户端口范围内，用 random.org
        真随机数生成可用端口。
      </p>
    </header>

    <form class="pg-form" @submit.prevent="generate">
      <div class="pg-row">
        <label class="field">
          <span class="field-label">生成数量</span>
          <input
            v-model.number="count"
            class="input mono"
            type="number"
            min="1"
            max="100"
            inputmode="numeric"
          />
        </label>

        <div class="range-group">
          <label class="field">
            <span class="field-label">起始端口</span>
            <input
              v-model.number="minPort"
              class="input mono"
              type="number"
              :min="PORT_MIN"
              :max="PORT_MAX"
              inputmode="numeric"
            />
          </label>
          <span class="range-dash" aria-hidden="true">–</span>
          <label class="field">
            <span class="field-label">结束端口</span>
            <input
              v-model.number="maxPort"
              class="input mono"
              type="number"
              :min="PORT_MIN"
              :max="PORT_MAX"
              inputmode="numeric"
            />
          </label>
        </div>
      </div>

      <div class="preset-row">
        <span class="preset-label">快捷</span>
        <div class="mini-seg" role="group" aria-label="快捷数量">
          <button
            v-for="n in [1, 5, 10, 20]"
            :key="n"
            type="button"
            class="mini-seg-item"
            :class="{ active: count === n }"
            @click="usePreset(n)"
          >
            {{ n }} 个
          </button>
        </div>
      </div>

      <div class="switch-row">
        <label class="switch">
          <input v-model="unique" type="checkbox" />
          <span class="switch-track"></span>
          <span class="switch-text">结果去重</span>
        </label>
        <label class="switch">
          <input v-model="sortAsc" type="checkbox" />
          <span class="switch-track"></span>
          <span class="switch-text">升序排列</span>
        </label>
      </div>

      <button class="btn primary block" type="submit" :disabled="loading">
        <span v-if="loading" class="spinner" aria-hidden="true"></span>
        <span>{{ loading ? '生成中…' : '生成端口' }}</span>
      </button>
    </form>

    <p class="pg-meta">
      当前范围共 <strong>{{ rangeSize.toLocaleString() }}</strong> 个端口 · 1024–49151 为 IANA
      注册端口与用户端口区间
    </p>

    <p v-if="error" class="alert" role="alert">{{ error }}</p>

    <div v-if="ports.length" class="results">
      <div class="results-bar" role="status" aria-live="polite">
        <span class="sr-only">已生成 {{ ports.length }} 个端口</span>
        <span class="status-badge" :class="sourceInfo.level" :title="sourceInfo.title">
          <span class="dot"></span>{{ sourceInfo.label }}
        </span>
        <span v-if="quotaText" class="quota">{{ quotaText }}</span>
        <button class="btn ghost small" type="button" @click="copyAll">
          {{ copiedKey === 'all' ? '已复制全部' : '复制全部' }}
        </button>
      </div>

      <div class="port-grid">
        <div
          v-for="(p, i) in ports"
          :key="p"
          class="port-card"
          :style="{ animationDelay: `${Math.min(i, 14) * 22}ms` }"
        >
          <div class="port-main">
            <span class="port-num">{{ p }}</span>
            <span v-if="lookupKnownPort(p)" class="port-service">{{ lookupKnownPort(p)!.name }}</span>
            <span v-else class="port-service muted">未收录常见服务</span>
          </div>
          <button
            class="icon-btn"
            type="button"
            :aria-label="`复制端口 ${p}`"
            @click="copy(String(p), String(p))"
          >
            <svg v-if="copiedKey !== String(p)" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="11" height="11" rx="2.5" />
              <path d="M5 15V5.5A2.5 2.5 0 0 1 7.5 3H15" />
            </svg>
            <svg v-else viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12.5 10 17.5 19 6.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <div v-else-if="!loading" class="empty">
      <div class="empty-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="12" rx="2.5" />
          <path d="M8 20h8M12 16v4" />
          <path d="M7.5 8.5h.01M12 8.5h.01M16.5 8.5h.01M7.5 11.8h.01M12 11.8h.01M16.5 11.8h.01" />
        </svg>
      </div>
      <p class="empty-title">还没有生成端口</p>
      <p class="empty-sub">点击「生成端口」，随机获得可用的注册端口</p>
    </div>
  </section>
</template>
