/**
 * 一个极小、可中断、带速度的弹簧动画工具。
 *
 * 仅用于「可被用户操作打断」的界面运动（例如分段控件的滑块）。
 * 设计准则来自 Apple《Designing Fluid Interfaces》：
 *   - 用 damping ratio（阻尼比）+ response（响应时间）描述弹簧，
 *     而不是 mass / stiffness / damping 三件套；
 *   - 弹簧可随时被重新指向新的目标值，并从「当前屏幕上的值 / 速度」继续，
 *     因此天然支持中断与反向，不会出现跳变或「撞墙」感；
 *   - 帧循环用 requestAnimationFrame（web 版的 CADisplayLink）。
 */

export interface SpringConfig {
  /** 阻尼比：1.0 = 临界阻尼（不超调），< 1.0 = 有回弹 */
  damping?: number
  /** 响应时间（秒）：越小越跟手。注意这不是「时长」 */
  response?: number
  /** 每次数值变化时回调（参数为当前值） */
  onUpdate?: (value: number) => void
  /** 弹簧静止后回调 */
  onRest?: () => void
}

export interface SpringController {
  readonly value: number
  /** 重新指向目标值；可传入初始速度（px/s），用于手势释放时的速度接力 */
  setTarget: (target: number, initialVelocity?: number) => void
  /** 立即落位（不播放动画），用于初始化或 reduced-motion */
  jumpTo: (value: number) => void
  /** 停止并移出帧循环 */
  stop: () => void
}

interface Core {
  value: number
  target: number
  velocity: number
  damping: number
  response: number
  onUpdate?: (value: number) => void
  onRest?: () => void
}

const registry = new Set<Core>()
let rafId = 0
let lastTs = 0

/** 静止阈值（px 与 px/s） */
const REST_DIST = 0.15
const REST_VEL = 0.15
/** 单帧最大步长，避免切后台回来时数值爆炸 */
const MAX_DT = 0.064
/** 物理子步长，保证数值稳定 */
const SUB_STEP = 0.008

function frame(ts: number) {
  if (!lastTs) lastTs = ts
  let dt = (ts - lastTs) / 1000
  lastTs = ts
  if (dt > MAX_DT) dt = MAX_DT
  if (dt < 0) dt = 0

  for (const core of Array.from(registry)) step(core, dt)

  if (registry.size > 0) {
    rafId = requestAnimationFrame(frame)
  } else {
    rafId = 0
    lastTs = 0
  }
}

function ensureLoop() {
  if (!rafId) {
    lastTs = 0
    rafId = requestAnimationFrame(frame)
  }
}

/** 用 response + damping 推导出弹簧并积分一步（固定子步长，半隐式欧拉） */
function step(core: Core, dt: number) {
  const omega = (2 * Math.PI) / Math.max(0.05, core.response)
  const k = omega * omega
  const c = 2 * core.damping * omega

  const sub = Math.max(1, Math.ceil(dt / SUB_STEP))
  const h = dt / sub
  let x = core.value
  let v = core.velocity

  for (let i = 0; i < sub; i++) {
    const a = -k * (x - core.target) - c * v
    v += a * h
    x += v * h
  }

  core.value = x
  core.velocity = v
  core.onUpdate?.(x)

  if (Math.abs(x - core.target) < REST_DIST && Math.abs(v) < REST_VEL) {
    core.value = core.target
    core.velocity = 0
    core.onUpdate?.(core.target)
    registry.delete(core)
    core.onRest?.()
  }
}

export function createSpring(initial: number, config: SpringConfig = {}): SpringController {
  const core: Core = {
    value: initial,
    target: initial,
    velocity: 0,
    damping: config.damping ?? 1,
    response: config.response ?? 0.35,
    onUpdate: config.onUpdate,
    onRest: config.onRest,
  }

  return {
    get value() {
      return core.value
    },
    setTarget(target: number, initialVelocity?: number) {
      core.target = target
      if (initialVelocity !== undefined && Number.isFinite(initialVelocity)) {
        core.velocity = initialVelocity
      }
      if (Math.abs(core.value - target) < REST_DIST && Math.abs(core.velocity) < REST_VEL) {
        core.value = target
        core.velocity = 0
        core.onUpdate?.(target)
        registry.delete(core)
        return
      }
      registry.add(core)
      ensureLoop()
    },
    jumpTo(value: number) {
      core.value = value
      core.target = value
      core.velocity = 0
      registry.delete(core)
      core.onUpdate?.(value)
    },
    stop() {
      registry.delete(core)
    },
  }
}

/** 是否处于「减弱动态效果」偏好 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}
