<script setup lang="ts">
import { computed, ref } from 'vue'
import { describeSource, fetchRandom, type SourceMeta } from '../composables/useRandom'
import {
  DISHES,
  FOOD_CATEGORIES,
  dishesByCategory,
  type Dish,
  type FoodCategory,
} from '../data/foods'

const category = ref<FoodCategory>('全部')
const noRepeat = ref(true)
const dish = ref<Dish | null>(null)
const loading = ref(false)
const error = ref('')
const meta = ref<SourceMeta | null>(null)
const eaten = ref<Set<string>>(new Set())

const sourceInfo = computed(() => describeSource(meta.value))
const pool = computed(() => {
  const base = dishesByCategory(category.value)
  return noRepeat.value ? base.filter((d) => !eaten.value.has(d.name)) : base
})
const remaining = computed(() => pool.value.length)
const total = computed(() => dishesByCategory(category.value).length)

function resetHistory() {
  eaten.value = new Set()
  dish.value = null
  error.value = ''
}

async function pick() {
  error.value = ''
  const candidates = pool.value
  if (candidates.length === 0) {
    error.value = '这个分类都被你吃遍啦，点「重置记录」再来一次吧'
    return
  }

  loading.value = true
  try {
    const data = await fetchRandom({ n: 1, min: 0, max: candidates.length - 1 })
    const index = data.numbers?.[0] ?? 0
    const chosen = candidates[Math.min(Math.max(index, 0), candidates.length - 1)]
    dish.value = chosen
    if (noRepeat.value && chosen) {
      const next = new Set(eaten.value)
      next.add(chosen.name)
      eaten.value = next
    }
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
</script>

<template>
  <section class="panel" id="panel-food" role="tabpanel" aria-labelledby="tab-food">
    <header class="panel-head">
      <p class="eyebrow">美食随机</p>
      <h1 class="panel-title">今天吃点啥</h1>
      <p class="panel-sub">选择困难症的救星 —— 让 random.org 帮你做这个决定。</p>
    </header>

    <div class="category-scroller" role="group" aria-label="菜系分类">
      <button
        v-for="c in FOOD_CATEGORIES"
        :key="c"
        type="button"
        class="chip"
        :class="{ active: category === c }"
        :aria-pressed="category === c"
        @click="category = c"
      >
        {{ c }}
      </button>
    </div>

    <div class="dish-stage" aria-live="polite">
      <Transition name="dish">
        <div v-if="dish" :key="dish.name" class="dish-card">
          <div class="dish-emoji">{{ dish.emoji }}</div>
          <h2 class="dish-name">{{ dish.name }}</h2>
          <div class="dish-tags">
            <span class="tag accent">{{ dish.category }}</span>
            <span v-for="t in dish.tags" :key="t" class="tag">{{ t }}</span>
          </div>
        </div>
        <div v-else :key="loading ? 'loading' : 'idle'" class="dish-placeholder">
          <div class="dish-emoji">{{ loading ? '🤔' : '🍽️' }}</div>
          <p>{{ loading ? '正在请示 random.org…' : '点一下，看看今天吃什么' }}</p>
        </div>
      </Transition>
    </div>

    <p v-if="error" class="alert" role="alert">{{ error }}</p>

    <div class="food-actions">
      <button class="btn primary block" type="button" :disabled="loading" @click="pick">
        <span v-if="loading" class="spinner" aria-hidden="true"></span>
        <span>{{ loading ? '选择中…' : dish ? '换一个' : '今天吃点啥' }}</span>
      </button>
      <div class="food-options">
        <label class="switch">
          <input v-model="noRepeat" type="checkbox" />
          <span class="switch-track"></span>
          <span class="switch-text">不重复</span>
        </label>
        <button
          class="btn ghost small"
          type="button"
          :disabled="eaten.size === 0"
          @click="resetHistory"
        >
          重置记录
        </button>
      </div>
    </div>

    <div v-if="dish" class="results-bar" role="status" aria-live="polite">
      <span class="sr-only">已选出 {{ dish.name }}</span>
      <span class="status-badge" :class="sourceInfo.level" :title="sourceInfo.title">
        <span class="dot"></span>{{ sourceInfo.label }}
      </span>
      <span class="quota">
        本分类还剩 {{ remaining }} / {{ total }} 道{{ noRepeat ? '（未吃过）' : '' }}
      </span>
    </div>

    <p class="hint">共收录 {{ DISHES.length }} 道菜，从 {{ FOOD_CATEGORIES.length - 1 }} 个分类里随机挑选。</p>
  </section>
</template>
