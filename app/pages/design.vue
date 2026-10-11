<script setup lang="ts">
import { X } from 'lucide-vue-next'

/**
 * Living style guide for Vibrafit's "Chalk & Signal" design system.
 * This is Kilian's reference for what to change and where — every token
 * and every component state is rendered here, live, against the real
 * CSS variables (not a copy of the values). Dev-only labels on this page
 * may be literal English; anything reused in-app goes through i18n.
 */
const { t } = useI18n()

const theme = useTheme()
const prefersDark = ref(false)

onMounted(() => {
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  prefersDark.value = mq.matches
  mq.addEventListener('change', (e) => {
    prefersDark.value = e.matches
  })
})

const isDark = computed(() => theme.value === 'dark' || (theme.value === 'system' && prefersDark.value))

const colorTokens = [
  { token: '--vf-color-bg', light: '#F1F3F2', dark: '#0E1110', usage: 'Page background' },
  { token: '--vf-color-surface', light: '#FFFFFF', dark: '#181C1A', usage: 'Cards, tab bar, raised surfaces' },
  { token: '--vf-color-text', light: '#111513', dark: '#EEF1EF', usage: 'Primary text' },
  { token: '--vf-color-muted', light: '#505955', dark: '#9BA5A0', usage: 'Secondary text, micro-labels' },
  { token: '--vf-color-accent', light: '#F04E12', dark: '#FF6A33', usage: 'Fills: buttons, ring fill, icons — never small text on light bg' },
  { token: '--vf-color-on-accent', light: '#111513', dark: '#111513', usage: 'Text/icon on top of accent fills' },
  { token: '--vf-color-accent-text', light: '#B93A0B', dark: '#FF8A5C', usage: 'Orange used as text (active tab label, hint "aim for")' },
  { token: '--vf-color-good', light: '#1E7A4C', dark: '#4CC38A', usage: 'Done / logged state' },
  { token: '--vf-color-on-good', light: '#FFFFFF', dark: '#0E1110', usage: 'Icon on top of good fills' },
  { token: '--vf-color-hard', light: '#B42318', dark: '#FF6B5E', usage: 'Missed state, danger action' },
  { token: '--vf-color-border', light: '#D5DAD7', dark: '#2A302D', usage: 'Hairline dividers, card edges (decorative)' },
  { token: '--vf-color-control-border', light: '#7A847F', dark: '#6B7570', usage: 'Interactive control borders — kept ≥3:1' },
  { token: '--vf-color-ring-track', light: '#EAEEEB', dark: '#262C29', usage: 'Goal-ring background track (lightened from the proposal to clear 3:1)' },
  { token: '--vf-color-chip-bg', light: '#E6EAE8', dark: '#232826', usage: 'Chips, rest-day dot fill' },
  { token: '--vf-color-scrim', light: 'rgba(17,21,19,.55)', dark: 'rgba(0,0,0,.72)', usage: 'Dim layer behind bottom sheets (UiSheet)' },
  { token: '--vf-color-hint-bg', light: '#FFE9DF', dark: '#2A1A12', usage: 'Progression-hint banner background' },
]

const contrastPairs = [
  { label: 'Body text on bg', ratio: '16.5:1 / 16.7:1' },
  { label: 'Muted text on bg', ratio: '6.5:1 / 7.5:1' },
  { label: 'Accent-text on bg', ratio: '5.1:1 / 8.2:1' },
  { label: 'On-accent on accent fill', ratio: '5.1:1 / 6.5:1' },
  { label: 'Control border on bg', ratio: '3.5:1 / 4.0:1' },
  { label: 'Ring fill on ring track', ratio: '3.1:1 / 5.0:1' },
]

const typeScale = [
  { token: '--vf-text-xs', px: '12px', sample: 'Micro label', display: false },
  { token: '--vf-text-sm', px: '14px', sample: 'Secondary line', display: false },
  { token: '--vf-text-base', px: '16px', sample: 'Body text floor', display: false },
  { token: '--vf-text-md', px: '18px', sample: 'Emphasised body', display: false },
  { token: '--vf-text-lg', px: '22px', sample: 'Card title', display: true },
  { token: '--vf-text-xl', px: '28px', sample: 'Section heading', display: true },
  { token: '--vf-text-2xl', px: '36px', sample: 'Large stat', display: true },
  { token: '--vf-text-display', px: '40px', sample: 'Page H1', display: true },
  { token: '--vf-text-timer', px: '64px', sample: '01:30', display: true },
  { token: '--vf-text-huge', px: '96px', sample: '9', display: true },
]

const spacingTokens = [
  '--vf-space-1',
  '--vf-space-2',
  '--vf-space-3',
  '--vf-space-4',
  '--vf-space-5',
  '--vf-space-6',
  '--vf-space-8',
  '--vf-space-10',
  '--vf-space-12',
  '--vf-space-16',
]

const radiusTokens = [
  { token: '--vf-radius', label: '6px — cards, buttons' },
  { token: '--vf-radius-sm', label: '4px — chips, set boxes' },
  { token: '--vf-radius-none', label: '0px — progress segments' },
]

// --- interactive demo state -------------------------------------------------
const stepperReps = ref(9)
const stepperLoad = ref(4)
const feeling = ref<'easy' | 'good' | 'hard' | null>('good')
const buttonLoading = ref(false)

function demoLoad() {
  buttonLoading.value = true
  setTimeout(() => (buttonLoading.value = false), 1400)
}

const weekDemo = [
  { label: 'Mon', state: 'done' as const },
  { label: 'Tue', state: 'planned' as const, today: true },
  { label: 'Wed', state: 'planned' as const },
  { label: 'Thu', state: 'missed' as const },
  { label: 'Fri', state: 'planned' as const },
  { label: 'Sat', state: 'rest' as const },
  { label: 'Sun', state: 'rest' as const },
]

// --- demo state for the Phase 1c pieces -----------------------------------
const restTotal = ref(20)
const restRemaining = ref(20)
let restTimer: ReturnType<typeof setInterval> | undefined

function restReset() {
  restTotal.value = 20
  restRemaining.value = 20
}
function restAdd() {
  restTotal.value += 15
  restRemaining.value += 15
}

const holdSeconds = ref(12)
const holdRunning = ref(false)
let holdTimer: ReturnType<typeof setInterval> | undefined
function holdToggle() {
  if (holdRunning.value) {
    holdRunning.value = false
    clearInterval(holdTimer)
    return
  }
  holdSeconds.value = 0
  holdRunning.value = true
  holdTimer = setInterval(() => holdSeconds.value++, 1000)
}

onMounted(() => {
  restTimer = setInterval(() => {
    if (restRemaining.value > 0) restRemaining.value--
  }, 1000)
})
onBeforeUnmount(() => {
  clearInterval(restTimer)
  clearInterval(holdTimer)
})

const sheetDemo = ref(false)
const painSheet = ref(false)
const leaveSheet = ref(false)

type TodayStateKey = 'ready' | 'progress' | 'done' | 'noEquipment' | 'noProgram'
const todayState = ref<TodayStateKey>('ready')
const todayStates: { key: TodayStateKey; label: string }[] = [
  { key: 'ready', label: 'Ready' },
  { key: 'progress', label: 'In progress' },
  { key: 'done', label: 'Done today' },
  { key: 'noEquipment', label: 'No equipment' },
  { key: 'noProgram', label: 'No program' },
]

type WorkoutStateKey = 'log' | 'hold' | 'rest' | 'restDone' | 'summary'
const workoutState = ref<WorkoutStateKey>('log')
const workoutStates: { key: WorkoutStateKey; label: string }[] = [
  { key: 'log', label: 'Log reps' },
  { key: 'hold', label: 'Log timed' },
  { key: 'rest', label: 'Rest' },
  { key: 'restDone', label: 'Rest over' },
  { key: 'summary', label: 'Summary' },
]
</script>

<template>
  <div class="guide">
    <header class="guide__header">
      <div class="guide__header-row">
        <div>
          <p class="vf-label">Vibrafit</p>
          <h1 class="vf-display guide__title">Design system</h1>
          <p class="vf-muted guide__subtitle">Chalk &amp; Signal — tokens and components, live.</p>
        </div>
        <UiThemeSwitch />
      </div>
      <NuxtLink to="/" class="guide__back">&larr; {{ t('design.backHome') }}</NuxtLink>
    </header>

    <!-- ============================== COLOUR ============================== -->
    <section class="guide__section" aria-labelledby="colour-h">
      <h2 id="colour-h" class="vf-display guide__h2">Colour</h2>
      <p class="vf-muted">
        Currently rendering <strong class="vf-muted">{{ isDark ? 'dark' : 'light' }}</strong> — use the switch above
        to compare. Light and dark are two separate palettes, never one inverted into the other.
      </p>
      <ul class="guide__swatches">
        <li v-for="c in colorTokens" :key="c.token" class="swatch">
          <span class="swatch__box" :style="{ background: `var(${c.token})` }" />
          <div class="swatch__meta">
            <code class="swatch__token">{{ c.token }}</code>
            <span class="vf-num swatch__value">{{ isDark ? c.dark : c.light }}</span>
            <span class="vf-muted swatch__usage">{{ c.usage }}</span>
          </div>
        </li>
      </ul>

      <h3 class="guide__h3">Verified contrast (light / dark)</h3>
      <table class="guide__table">
        <tbody>
          <tr v-for="row in contrastPairs" :key="row.label">
            <td>{{ row.label }}</td>
            <td class="vf-num">{{ row.ratio }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- ============================== TYPE ============================== -->
    <section class="guide__section" aria-labelledby="type-h">
      <h2 id="type-h" class="vf-display guide__h2">Type</h2>
      <p class="vf-muted">Barlow Condensed 800 for headings and every number · Barlow for body.</p>
      <ul class="guide__typescale">
        <li v-for="s in typeScale" :key="s.token" class="typerow">
          <span
            class="typerow__sample"
            :class="s.display ? 'vf-display' : ''"
            :style="{ fontSize: `var(${s.token})`, fontFamily: s.display ? undefined : 'var(--vf-font-body)' }"
          >{{ s.sample }}</span>
          <code class="typerow__token">{{ s.token }} · {{ s.px }}</code>
        </li>
      </ul>
    </section>

    <!-- ============================== SPACING / RADIUS ============================== -->
    <section class="guide__section" aria-labelledby="space-h">
      <h2 id="space-h" class="vf-display guide__h2">Spacing &amp; radius</h2>
      <ul class="guide__spacing">
        <li v-for="s in spacingTokens" :key="s" class="spacerow">
          <span class="spacerow__bar" :style="{ width: `var(${s})` }" />
          <code>{{ s }}</code>
        </li>
      </ul>
      <ul class="guide__radii">
        <li v-for="r in radiusTokens" :key="r.token" class="radiusitem">
          <span class="radiusitem__box" :style="{ borderRadius: `var(${r.token})` }" />
          <code>{{ r.token }} <span class="vf-muted">{{ r.label }}</span></code>
        </li>
      </ul>
      <p class="vf-muted">Tap target minimum: <code class="vf-num">--vf-tap-min (48px)</code>.</p>
    </section>

    <!-- ============================== COMPONENTS ============================== -->
    <section class="guide__section" aria-labelledby="components-h">
      <h2 id="components-h" class="vf-display guide__h2">Components</h2>

      <h3 class="guide__h3">UiButton</h3>
      <div class="guide__row">
        <UiButton variant="primary">Primary</UiButton>
        <UiButton variant="secondary">Secondary</UiButton>
        <UiButton variant="ghost">Ghost</UiButton>
        <UiButton variant="danger">Danger</UiButton>
      </div>
      <div class="guide__row">
        <UiButton variant="primary" disabled>Disabled</UiButton>
        <UiButton variant="primary" :loading="buttonLoading" @click="demoLoad">{{ buttonLoading ? 'Working…' : 'Click for loading' }}</UiButton>
      </div>
      <UiButton variant="primary" full-width>Full width</UiButton>

      <h3 class="guide__h3">UiStepper</h3>
      <div class="guide__grid-2">
        <UiStepper v-model="stepperReps" :min="0" :max="30" unit="reps" />
        <UiStepper v-model="stepperLoad" :min="0" :max="60" :step="2" unit="kg" />
      </div>

      <h3 class="guide__h3">UiFeeling</h3>
      <UiFeeling v-model="feeling" />

      <h3 class="guide__h3">UiWeekStrip</h3>
      <p class="vf-muted">Every state shown: Mon done, Tue today+planned, Thu missed, Sat/Sun rest.</p>
      <UiWeekStrip :days="weekDemo" />

      <h3 class="guide__h3">UiGoalRing</h3>
      <div class="guide__row">
        <UiGoalRing :done="0" :target="3" />
        <UiGoalRing :done="2" :target="3" />
        <UiGoalRing :done="3" :target="3" />
      </div>

      <h3 class="guide__h3">UiSetBox</h3>
      <div class="guide__row guide__row--tight">
        <UiSetBox :index="1" state="logged" target="9 reps × 4 kg" />
        <UiSetBox :index="2" state="current" target="9 reps × 4 kg" />
        <UiSetBox :index="3" state="pending" target="9 reps × 4 kg" />
        <UiSetBox :index="4" state="skipped" target="9 reps × 4 kg" />
      </div>

      <h3 class="guide__h3">UiCard</h3>
      <div class="guide__stack">
        <UiCard>
          <p class="vf-label">Default</p>
          <p>Flat surface, hairline border. Used for most content blocks.</p>
        </UiCard>
        <UiCard variant="hero">
          <p class="vf-label">Hero</p>
          <p>One per screen — the featured card (e.g. today's workout).</p>
        </UiCard>
      </div>

      <h3 class="guide__h3">UiTabBar</h3>
      <div class="guide__tabbar-demo">
        <UiTabBar force-active="today" />
      </div>

      <h3 class="guide__h3">UiThemeSwitch</h3>
      <UiThemeSwitch />

      <h3 class="guide__h3">UiButton size="xl" (thumb button)</h3>
      <p class="vf-muted">72px (<code>--vf-size-button-xl</code>). One per screen: Start, Log set, Start timer / Stop.</p>
      <div class="guide__stack">
        <UiButton variant="primary" size="xl" full-width>Log set 2</UiButton>
        <UiButton variant="primary" size="xl" full-width disabled>Log set 2</UiButton>
        <UiButton variant="secondary" size="xl" full-width>Start timer</UiButton>
      </div>

      <h3 class="guide__h3">UiIconButton</h3>
      <div class="guide__row">
        <UiIconButton label="Leave workout"><X :size="22" /></UiIconButton>
      </div>

      <h3 class="guide__h3">UiHint (the "why" line)</h3>
      <div class="guide__stack">
        <UiHint emphasis="Aim for 10–12 at 7.85 kg." />
        <UiHint context="Last time 8 / 8 / 8." emphasis="Aim for 9 today." />
      </div>

      <h3 class="guide__h3">UiProgressSegments</h3>
      <UiProgressSegments :segments="['done', 'skipped', 'current', 'pending', 'pending', 'pending']" label="Exercise 3 of 6, 1 done, 1 skipped" />

      <h3 class="guide__h3">UiSyncBadge (every state)</h3>
      <div class="guide__row">
        <UiSyncBadge state="synced" label="All sets saved" />
        <UiSyncBadge state="syncing" label="Syncing…" />
        <UiSyncBadge state="waiting" label="3 sets waiting to sync" />
        <UiSyncBadge state="offline" label="Offline · sets saved on this phone" />
        <UiSyncBadge state="failed" label="Couldn't sync · retrying" />
      </div>

      <h3 class="guide__h3">UiRestTimer</h3>
      <p class="vf-muted">Live demo: counts down from 20 s. +15 s and Skip are page-level buttons.</p>
      <div class="guide__stack">
        <UiRestTimer
          :remaining="restRemaining"
          :total="restTotal"
          label="Rest"
          done-label="Rest over"
          :time-label="`${restRemaining} seconds`"
        />
        <div class="guide__row">
          <UiButton variant="secondary" @click="restAdd">+15 s</UiButton>
          <UiButton variant="ghost" @click="restReset">Restart demo</UiButton>
        </div>
      </div>

      <h3 class="guide__h3">UiHoldTimer (timed exercises)</h3>
      <div class="guide__grid-2">
        <UiHoldTimer :seconds="0" :running="false" :target="20" status-label="Ready" time-label="0 seconds" />
        <UiHoldTimer :seconds="holdSeconds" :running="holdRunning" :target="20" :status-label="holdSeconds >= 20 ? 'Target reached' : holdRunning ? 'Hold' : 'Stopped'" :time-label="`${holdSeconds} seconds`" />
      </div>
      <div class="guide__row">
        <UiButton :variant="holdRunning ? 'danger' : 'secondary'" @click="holdToggle">{{ holdRunning ? 'Stop' : 'Start demo' }}</UiButton>
      </div>

      <h3 class="guide__h3">UiExerciseRow (every state)</h3>
      <UiCard>
        <ul class="guide__list">
          <UiExerciseRow name="Goblet squat" detail="3 × 10–12" value="7.85 kg" />
          <UiExerciseRow name="One-arm row" detail="3 × 10 per side" value="7.85 kg" />
          <UiExerciseRow name="Push-up" detail="3 × 6–12" value="Bodyweight" />
          <UiExerciseRow name="Plank" detail="3 × 20–40 s" />
          <UiExerciseRow name="Goblet squat" state="done" detail="7.85 kg" value="10 · 10 · 9" />
          <UiExerciseRow name="Overhead press" state="skipped" state-label="Skipped" />
          <UiExerciseRow name="Reverse lunge" state="pain" state-label="Stopped for pain" detail="1 set logged" />
        </ul>
      </UiCard>

      <h3 class="guide__h3">UiSheet</h3>
      <div class="guide__row">
        <UiButton variant="secondary" @click="sheetDemo = true">Open demo sheet</UiButton>
      </div>
      <UiSheet :open="sheetDemo" title="Leave this workout?" @close="sheetDemo = false">
        <p class="vf-muted">Your 4 logged sets are saved. You can pick up where you stopped.</p>
        <UiButton variant="primary" full-width @click="sheetDemo = false">Keep going</UiButton>
        <UiButton variant="secondary" full-width @click="sheetDemo = false">Leave and resume later</UiButton>
      </UiSheet>
    </section>

    <!-- ============================== SAMPLE: TODAY ============================== -->
    <section class="guide__section" aria-labelledby="today-h">
      <h2 id="today-h" class="vf-display guide__h2">Sample: Today (360 px, every state)</h2>
      <div class="demo-switch" role="group" aria-label="Today state">
        <button
          v-for="s in todayStates"
          :key="s.key"
          type="button"
          class="demo-switch__btn"
          :aria-pressed="todayState === s.key"
          @click="todayState = s.key"
        >{{ s.label }}</button>
      </div>
      <div class="phone-demo phone-demo--360">
        <div class="phone-demo__content">
          <header class="screen-head">
            <div>
              <p class="vf-label">Tuesday 14 October</p>
              <h1 class="vf-display screen-head__title">Today</h1>
            </div>
            <UiSyncBadge v-if="todayState === 'progress'" state="waiting" label="3 sets waiting to sync" />
          </header>

          <!-- READY -->
          <template v-if="todayState === 'ready'">
            <UiCard variant="hero">
              <div class="stack">
                <div>
                  <p class="vf-label">Today's workout</p>
                  <p class="vf-display hero-title">Workout A</p>
                  <p class="vf-muted hero-meta"><span class="vf-num">6</span> exercises · ~<span class="vf-num">35</span> min · Full body</p>
                </div>
                <UiButton variant="primary" size="xl" full-width>Start workout</UiButton>
              </div>
            </UiCard>
            <UiButton variant="ghost" full-width>Short on time? 10-min version</UiButton>
            <p class="vf-muted hero-meta">10-min version: 4 exercises, 2 sets each.</p>
            <UiCard>
              <p class="vf-label">In this workout</p>
              <ul class="guide__list">
                <UiExerciseRow name="Goblet squat" detail="3 × 10–12" value="7.85 kg" />
                <UiExerciseRow name="Push-up" detail="3 × 6–12" value="Bodyweight" />
                <UiExerciseRow name="One-arm row" detail="3 × 10 per side" value="7.85 kg" />
                <UiExerciseRow name="Band pull-apart" detail="3 × 15" value="Orange band" />
                <UiExerciseRow name="Overhead press" detail="3 × 10" value="2 × 3.85 kg" />
                <UiExerciseRow name="Plank" detail="3 × 20–40 s" />
              </ul>
              <a class="text-link" href="#today-h">Change equipment</a>
            </UiCard>
          </template>

          <!-- IN PROGRESS -->
          <template v-else-if="todayState === 'progress'">
            <UiCard variant="hero">
              <div class="stack">
                <div>
                  <p class="vf-label">In progress</p>
                  <p class="vf-display hero-title">Workout A</p>
                  <p class="vf-muted hero-meta"><span class="vf-num">3</span> of <span class="vf-num">6</span> exercises · <span class="vf-num">8</span> sets logged</p>
                </div>
                <UiProgressSegments :segments="['done', 'done', 'current', 'pending', 'pending', 'pending']" label="Exercise 3 of 6, 2 done" />
                <UiButton variant="primary" size="xl" full-width>Resume workout</UiButton>
              </div>
            </UiCard>
            <UiButton variant="ghost" full-width>Finish workout now</UiButton>
          </template>

          <!-- DONE TODAY -->
          <template v-else-if="todayState === 'done'">
            <UiCard variant="hero">
              <div class="stack">
                <div>
                  <p class="vf-label">Today</p>
                  <p class="vf-display hero-title">Done for today</p>
                  <p class="vf-muted hero-meta">Workout A · <span class="vf-num">6</span> exercises · <span class="vf-num">17</span> sets</p>
                </div>
                <UiButton variant="secondary" full-width>See summary</UiButton>
              </div>
            </UiCard>
            <UiCard>
              <p class="vf-label">Next up</p>
              <p class="vf-display hero-title">Workout B</p>
              <p class="vf-muted hero-meta">Rest up. It's here when you're ready.</p>
            </UiCard>
          </template>

          <!-- NO EQUIPMENT -->
          <template v-else-if="todayState === 'noEquipment'">
            <UiCard variant="hero">
              <div class="stack">
                <div>
                  <p class="vf-label">First step</p>
                  <p class="vf-display hero-title">Add your equipment</p>
                  <p class="vf-muted hero-meta">Tell Vibrafit what you have at home. Your workouts are built from it, and only use weights you can actually make.</p>
                </div>
                <UiButton variant="primary" size="xl" full-width>Add my equipment</UiButton>
              </div>
            </UiCard>
          </template>

          <!-- NO PROGRAM -->
          <template v-else>
            <UiCard variant="hero">
              <div class="stack">
                <div>
                  <p class="vf-label">Almost there</p>
                  <p class="vf-display hero-title">Build your program</p>
                  <p class="vf-muted hero-meta">We'll pick exercises and weights from your equipment. It takes a few seconds.</p>
                </div>
                <UiButton variant="primary" size="xl" full-width>Build my program</UiButton>
                <a class="text-link" href="#today-h">Change equipment first</a>
              </div>
            </UiCard>
          </template>

          <template v-if="todayState === 'ready' || todayState === 'progress' || todayState === 'done'">
            <UiCard>
              <div class="goal-row">
                <UiGoalRing :done="todayState === 'done' ? 3 : 2" :target="3" />
                <div>
                  <p class="goal-row__title">{{ todayState === 'done' ? 'Goal hit. Nice week.' : 'One more to hit your goal' }}</p>
                  <p class="vf-muted goal-row__meta">Goal: 3 workouts a week</p>
                </div>
              </div>
            </UiCard>
            <UiWeekStrip :days="weekDemo" />
          </template>
        </div>
        <UiTabBar force-active="today" />
      </div>
    </section>

    <!-- ============================== SAMPLE: WORKOUT MODE ============================== -->
    <section class="guide__section" aria-labelledby="workout-h">
      <h2 id="workout-h" class="vf-display guide__h2">Sample: Workout mode (360 px)</h2>
      <div class="demo-switch" role="group" aria-label="Workout state">
        <button
          v-for="s in workoutStates"
          :key="s.key"
          type="button"
          class="demo-switch__btn"
          :aria-pressed="workoutState === s.key"
          @click="workoutState = s.key"
        >{{ s.label }}</button>
      </div>
      <div class="phone-demo phone-demo--360">
        <div class="phone-demo__content phone-demo__content--workout">
          <!-- Shared top: exit, title, pain/skip, progress, sync -->
          <template v-if="workoutState !== 'summary'">
            <div class="wk-bar">
              <UiIconButton label="Leave workout" @click="leaveSheet = true"><X :size="22" /></UiIconButton>
              <p class="vf-label wk-bar__title">Workout A</p>
              <UiButton variant="ghost" @click="painSheet = true">Pain / Skip</UiButton>
            </div>
            <UiProgressSegments :segments="['done', 'current', 'pending', 'pending', 'pending', 'pending']" label="Exercise 2 of 6, 1 done" />
            <div class="wk-meta">
              <span class="vf-muted">Exercise <span class="vf-num">2</span> of <span class="vf-num">6</span></span>
              <UiSyncBadge :state="workoutState === 'rest' ? 'waiting' : 'synced'" :label="workoutState === 'rest' ? '1 set waiting to sync' : 'All sets saved'" />
            </div>
          </template>

          <!-- LOG: reps -->
          <template v-if="workoutState === 'log'">
            <div>
              <h1 class="vf-display wk-title">One-arm row</h1>
              <p class="vf-muted wk-sub"><span class="vf-num">10</span> per side · do both sides, then log</p>
            </div>
            <div class="wk-sets">
              <span class="vf-label">Set 2 of 3</span>
              <div class="guide__row guide__row--tight">
                <UiSetBox :index="1" state="logged" />
                <UiSetBox :index="2" state="current" />
                <UiSetBox :index="3" state="pending" />
              </div>
            </div>
            <UiHint emphasis="Aim for 10 per side at 7.85 kg." context="Stop each set with about 2 reps left." />
            <UiStepper v-model="stepperReps" :min="0" :max="50" unit="reps per side" />
            <div>
              <p class="vf-label feeling-label">{{ t('feeling.question') }}</p>
              <UiFeeling v-model="feeling" />
            </div>
            <UiButton variant="primary" size="xl" full-width>{{ t('workout.logSet', { n: 2 }) }}</UiButton>
          </template>

          <!-- LOG: timed (plank) -->
          <template v-else-if="workoutState === 'hold'">
            <div>
              <h1 class="vf-display wk-title">Plank</h1>
              <p class="vf-muted wk-sub">Hold with a straight back</p>
            </div>
            <div class="wk-sets">
              <span class="vf-label">Set 1 of 3</span>
              <div class="guide__row guide__row--tight">
                <UiSetBox :index="1" state="current" />
                <UiSetBox :index="2" state="pending" />
                <UiSetBox :index="3" state="pending" />
              </div>
            </div>
            <UiHint emphasis="Aim for 20–40 seconds." context="Stop when your form slips, not when it burns." />
            <UiHoldTimer :seconds="24" :running="true" :target="20" status-label="Target reached" time-label="24 seconds" />
            <UiButton variant="danger" size="xl" full-width>Stop</UiButton>
          </template>

          <!-- REST -->
          <template v-else-if="workoutState === 'rest' || workoutState === 'restDone'">
            <div class="wk-rest">
              <UiRestTimer
                :remaining="workoutState === 'rest' ? 74 : 0"
                :total="90"
                label="Rest"
                done-label="Rest over"
                :time-label="workoutState === 'rest' ? '1 minute 14 seconds' : 'Rest over'"
              />
              <p class="vf-muted wk-logged">Set 1: <span class="vf-num">10</span> reps per side logged. <button type="button" class="text-btn">Fix</button></p>
            </div>
            <UiCard>
              <p class="vf-label">Up next</p>
              <p class="vf-display wk-next">Set 2 of 3</p>
              <p class="vf-muted wk-sub">One-arm row · aim for 10 per side at 7.85 kg</p>
            </UiCard>
            <div class="wk-actions">
              <UiButton variant="secondary" size="xl">+15 s</UiButton>
              <UiButton variant="primary" size="xl">{{ workoutState === 'rest' ? 'Skip rest' : 'Start set 2' }}</UiButton>
            </div>
          </template>

          <!-- SUMMARY -->
          <template v-else>
            <header>
              <p class="vf-label">Workout A · 32 min</p>
              <h1 class="vf-display wk-title">Workout done</h1>
              <p class="vf-muted wk-sub">Every set is saved. Nice work showing up.</p>
            </header>
            <div class="wk-stats">
              <div><p class="vf-num wk-stat">5<span class="wk-stat__of">/6</span></p><p class="vf-label">Exercises</p></div>
              <div><p class="vf-num wk-stat">15</p><p class="vf-label">Sets</p></div>
              <div><p class="vf-num wk-stat">32</p><p class="vf-label">Minutes</p></div>
            </div>
            <UiCard>
              <ul class="guide__list">
                <UiExerciseRow name="Goblet squat" state="done" detail="7.85 kg" value="12 · 11 · 10" />
                <UiExerciseRow name="Push-up" state="done" detail="Bodyweight" value="8 · 8 · 7" />
                <UiExerciseRow name="One-arm row" state="done" detail="7.85 kg per side" value="10 · 10 · 10" />
                <UiExerciseRow name="Band pull-apart" state="skipped" state-label="Skipped" />
                <UiExerciseRow name="Overhead press" state="pain" state-label="Stopped for pain" detail="1 set logged" />
                <UiExerciseRow name="Plank" state="done" detail="3 sets" value="25 · 24 · 20 s" />
              </ul>
            </UiCard>
            <UiHint emphasis="Pain is a reason to stop. This isn't medical advice. If it keeps happening, check with a doctor or physio." />
            <UiCard>
              <div class="goal-row">
                <UiGoalRing :done="3" :target="3" />
                <div>
                  <p class="goal-row__title">Goal hit. Nice week.</p>
                  <p class="vf-muted goal-row__meta">3 of 3 workouts this week</p>
                </div>
              </div>
            </UiCard>
            <UiSyncBadge state="waiting" label="3 sets waiting to sync" />
            <UiButton variant="primary" size="xl" full-width>Back to Today</UiButton>
          </template>
        </div>
      </div>

      <UiSheet :open="painSheet" title="Pain or skipping?" @close="painSheet = false">
        <UiButton variant="secondary" full-width @click="painSheet = false">Skip this exercise</UiButton>
        <UiButton variant="danger" full-width @click="painSheet = false">Pain: stop this exercise</UiButton>
        <p class="vf-muted sheet-note">Sharp or joint pain means stop. Tired muscles are normal. Vibrafit isn't medical advice. If pain continues, check with a doctor or physio.</p>
        <UiButton variant="ghost" full-width @click="painSheet = false">Back to workout</UiButton>
      </UiSheet>

      <UiSheet :open="leaveSheet" title="Leave this workout?" @close="leaveSheet = false">
        <p class="vf-muted sheet-note">Your 4 logged sets are saved. You can pick up where you stopped.</p>
        <UiButton variant="primary" full-width @click="leaveSheet = false">Keep going</UiButton>
        <UiButton variant="secondary" full-width @click="leaveSheet = false">Leave and resume later</UiButton>
        <UiButton variant="ghost" full-width @click="leaveSheet = false">Finish workout now</UiButton>
      </UiSheet>
    </section>
  </div>
</template>

<style scoped>
.guide {
  max-width: 1040px;
  margin: 0 auto;
  padding: var(--vf-space-6) var(--vf-space-4) var(--vf-space-16);
}

.guide__header {
  margin-bottom: var(--vf-space-8);
}

.guide__header-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--vf-space-4);
  justify-content: space-between;
  align-items: flex-start;
}

.guide__title {
  font-size: var(--vf-text-display);
  margin-top: var(--vf-space-1);
}

.guide__subtitle {
  margin-top: var(--vf-space-1);
}

.guide__back {
  display: inline-block;
  margin-top: var(--vf-space-4);
  color: var(--vf-color-muted);
  font-size: var(--vf-text-sm);
  text-decoration: underline;
}

.guide__section {
  margin-top: var(--vf-space-12);
  padding-top: var(--vf-space-8);
  border-top: 1px solid var(--vf-color-border);
}

.guide__h2 {
  font-size: var(--vf-text-xl);
  margin-bottom: var(--vf-space-4);
}

.guide__h3 {
  font-family: var(--vf-font-body);
  font-size: var(--vf-text-sm);
  font-weight: var(--vf-weight-semibold);
  text-transform: uppercase;
  letter-spacing: var(--vf-label-track);
  color: var(--vf-color-muted);
  margin: var(--vf-space-8) 0 var(--vf-space-3);
}

/* colour swatches */
.guide__swatches {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--vf-space-3);
  grid-template-columns: 1fr;
}

.swatch {
  display: flex;
  gap: var(--vf-space-3);
  align-items: flex-start;
}

.swatch__box {
  flex: none;
  width: 48px;
  height: 48px;
  border-radius: var(--vf-radius);
  border: 1px solid var(--vf-color-border);
}

.swatch__meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.swatch__token {
  font-size: var(--vf-text-sm);
}

.swatch__value {
  font-size: var(--vf-text-sm);
}

.swatch__usage {
  font-size: var(--vf-text-sm);
}

.guide__table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--vf-text-sm);
}

.guide__table td {
  padding: var(--vf-space-2) 0;
  border-bottom: 1px solid var(--vf-color-border);
}

/* type scale */
.guide__typescale {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--vf-space-4);
}

.typerow {
  display: flex;
  flex-direction: column;
  gap: var(--vf-space-1);
}

.typerow__sample {
  line-height: 1.1;
}

.typerow__token {
  font-size: var(--vf-text-xs);
  color: var(--vf-color-muted);
}

/* spacing / radius */
.guide__spacing {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--vf-space-2);
}

.spacerow {
  display: flex;
  align-items: center;
  gap: var(--vf-space-3);
}

.spacerow__bar {
  height: 10px;
  background: var(--vf-color-accent);
  border-radius: var(--vf-radius-none);
}

.spacerow code,
.radiusitem code {
  font-size: var(--vf-text-xs);
  color: var(--vf-color-muted);
}

.guide__radii {
  list-style: none;
  margin: var(--vf-space-4) 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--vf-space-3);
}

.radiusitem {
  display: flex;
  align-items: center;
  gap: var(--vf-space-3);
}

.radiusitem__box {
  width: 40px;
  height: 40px;
  background: var(--vf-color-surface);
  border: 1px solid var(--vf-color-control-border);
}

/* component rows */
.guide__row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--vf-space-3);
  align-items: center;
  margin-bottom: var(--vf-space-3);
}

.guide__row--tight {
  gap: var(--vf-space-2);
}

.guide__grid-2 {
  display: grid;
  grid-template-columns: 1fr; /* stacked on phones: two steppers side by side need ~460px */
  gap: var(--vf-space-4);
}

.guide__stack {
  display: flex;
  flex-direction: column;
  gap: var(--vf-space-3);
}

.guide__tabbar-demo {
  border: 1px solid var(--vf-color-border);
  border-radius: var(--vf-radius);
  overflow: hidden;
  max-width: 420px;
}

/* phone-width sample screens */
.phone-demo {
  max-width: 375px;
  border: 1px solid var(--vf-color-border);
  border-radius: var(--vf-radius);
  overflow: hidden;
  background: var(--vf-color-bg);
}

.phone-demo__content {
  display: flex;
  flex-direction: column;
  gap: var(--vf-space-4);
  padding: var(--vf-space-4);
}

.phone-demo__links {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.goal-row {
  display: flex;
  gap: var(--vf-space-4);
  align-items: center;
}

.goal-row__title {
  font-weight: var(--vf-weight-semibold);
}

.goal-row__meta {
  margin-top: var(--vf-space-1);
  font-size: var(--vf-text-sm);
}

.hero-title {
  font-size: var(--vf-text-xl);
  margin-top: var(--vf-space-2);
}

.hero-meta {
  margin-top: var(--vf-space-1);
  font-size: var(--vf-text-sm);
}

.hint-line {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--vf-space-3);
  border-radius: var(--vf-radius);
  background: var(--vf-color-hint-bg);
  font-size: var(--vf-text-sm);
}

.hint-line__accent {
  color: var(--vf-color-accent-text);
}

.feeling-label {
  margin-bottom: var(--vf-space-2);
}

@media (min-width: 640px) {
  .guide__swatches,
  .guide__grid-2 {
    grid-template-columns: 1fr 1fr;
  }
}

/* ---- Phase 1c samples ---- */
.guide__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.demo-switch {
  display: flex;
  flex-wrap: wrap;
  gap: var(--vf-space-2);
  margin-bottom: var(--vf-space-4);
}

.demo-switch__btn {
  min-height: var(--vf-tap-min);
  padding: 0 var(--vf-space-4);
  border-radius: var(--vf-radius);
  border: var(--vf-border) solid var(--vf-color-control-border);
  background: transparent;
  color: var(--vf-color-text);
  font-weight: var(--vf-weight-semibold);
  font-size: var(--vf-text-sm);
  cursor: pointer;
}

.demo-switch__btn[aria-pressed='true'] {
  background: var(--vf-color-text);
  color: var(--vf-color-bg);
  border-color: var(--vf-color-text);
}

.phone-demo--360 {
  max-width: 360px;
}

.stack {
  display: flex;
  flex-direction: column;
  gap: var(--vf-space-4);
}

.screen-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--vf-space-3);
}

.screen-head__title {
  font-size: var(--vf-text-display);
}

.text-link,
.text-btn {
  display: inline-flex;
  align-items: center;
  min-height: var(--vf-tap-min);
  padding: 0 var(--vf-space-2);
  color: var(--vf-color-accent-text);
  font-weight: var(--vf-weight-semibold);
  text-decoration: underline;
  background: none;
  border: 0;
  font-size: inherit;
  cursor: pointer;
}

.text-link {
  margin-top: var(--vf-space-2);
}

.wk-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--vf-space-2);
}

.wk-bar__title {
  flex: 1;
  text-align: center;
}

.wk-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--vf-space-2);
  font-size: var(--vf-text-sm);
}

.wk-title {
  font-size: var(--vf-text-xl);
}

.wk-sub {
  font-size: var(--vf-text-sm);
  margin-top: var(--vf-space-1);
}

.wk-sets {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.wk-rest {
  display: flex;
  flex-direction: column;
  gap: var(--vf-space-3);
  padding-top: var(--vf-space-6);
}

.wk-rest .wk-logged {
  text-align: center;
  font-size: var(--vf-text-sm);
}

.wk-next {
  font-size: var(--vf-text-lg);
  margin-top: var(--vf-space-1);
}

.wk-actions {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: var(--vf-space-3);
}

.wk-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--vf-space-3);
}

.wk-stat {
  font-size: var(--vf-text-2xl);
  line-height: 1;
}

.wk-stat__of {
  color: var(--vf-color-muted);
  font-size: var(--vf-text-lg);
}

.sheet-note {
  font-size: var(--vf-text-sm);
}
</style>
