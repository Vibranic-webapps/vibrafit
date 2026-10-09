<script setup lang="ts">
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
    </section>

    <!-- ============================== SAMPLE: TODAY ============================== -->
    <section class="guide__section" aria-labelledby="today-h">
      <h2 id="today-h" class="vf-display guide__h2">Sample: Today</h2>
      <div class="phone-demo">
        <div class="phone-demo__content">
          <UiWeekStrip :days="weekDemo" />

          <UiCard>
            <div class="goal-row">
              <UiGoalRing :done="2" :target="3" />
              <div>
                <p class="goal-row__title">One more to hit your goal</p>
                <p class="vf-muted goal-row__meta">Goal: 3 workouts a week</p>
              </div>
            </div>
          </UiCard>

          <UiCard variant="hero">
            <p class="vf-label">Today's workout</p>
            <p class="vf-display hero-title">Workout A</p>
            <p class="vf-muted hero-meta"><span class="vf-num">6</span> exercises · ~<span class="vf-num">35</span> min · Full body</p>
            <p class="hint-line">
              <span class="vf-muted">Last time <span class="vf-num">8 / 8 / 8</span>.</span>
              <strong class="hint-line__accent">Aim for 9 today.</strong>
            </p>
            <UiButton variant="primary" full-width>{{ t('workout.start') }}</UiButton>
          </UiCard>

          <UiButton variant="ghost" full-width>Short on time? 10-min version</UiButton>
        </div>
        <UiTabBar force-active="today" />
      </div>
    </section>

    <!-- ============================== SAMPLE: WORKOUT MODE ============================== -->
    <section class="guide__section" aria-labelledby="workout-h">
      <h2 id="workout-h" class="vf-display guide__h2">Sample: Workout mode</h2>
      <div class="phone-demo">
        <div class="phone-demo__content">
          <div>
            <p class="vf-label">Workout A · 2 of 6</p>
            <p class="vf-display hero-title">Reverse lunges</p>
            <p class="vf-muted hero-meta">Set 2 of 3 · target <span class="vf-num">9 reps × 2 × 4 kg</span></p>
          </div>

          <div class="guide__row guide__row--tight">
            <UiSetBox :index="1" state="logged" target="9 reps × 4 kg" />
            <UiSetBox :index="2" state="current" target="9 reps × 4 kg" />
            <UiSetBox :index="3" state="pending" target="9 reps × 4 kg" />
          </div>

          <p class="hint-line">
            <span class="vf-muted">Last time <span class="vf-num">8 / 8 / 8</span>.</span>
            <strong class="hint-line__accent">Aim for 9 today.</strong>
          </p>

          <UiStepper v-model="stepperReps" :min="0" :max="30" unit="reps" />

          <div>
            <p class="vf-label feeling-label">{{ t('feeling.question') }}</p>
            <UiFeeling v-model="feeling" />
          </div>

          <UiButton variant="primary" full-width>{{ t('workout.logSet', { n: 2 }) }}</UiButton>

          <div class="phone-demo__links">
            <span class="vf-muted">Rest timer: <span class="vf-num">90s</span></span>
            <UiButton variant="ghost">{{ t('workout.skipExercise') }}</UiButton>
          </div>
        </div>
      </div>
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
</style>
