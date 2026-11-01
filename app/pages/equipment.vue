<script setup lang="ts">
/**
 * Equipment screen: the user enters the gear they own and sees, live, every
 * load that gear can build. Weights are typed in kg and converted to integer
 * grams right away (non-negotiable #2); the form keeps text so half-typed
 * numbers like "1." don't fight the user.
 *
 * Layout: the result first (a one-line summary of the loads you can build, tap
 * to open the full list), then the gear, then a Save bar pinned above the tab
 * bar that also shows how many loads the current form makes. "How many" is a
 * stepper; plates are added with one tap from a short list of common weights.
 */
import { Plus } from 'lucide-vue-next'
import { buildableLoads, type Equipment } from '~~/shared/utils/loads'
import { EQUIPMENT_LIMITS } from '~~/shared/utils/equipmentLimits'
import { COMMON_PLATE_GRAMS } from '~~/shared/utils/equipmentPresets'
import { summarizeLoads } from '~~/shared/utils/loadsSummary'

definePageMeta({ layout: 'tabs' })

const { t } = useI18n()
const L = EQUIPMENT_LIMITS

// Plain string (not a path literal) keeps TS away from Nitro's typed route map.
const EQUIPMENT_URL: string = '/api/equipment'

/** Shape the API sends and receives. All weights are integer grams. */
interface EquipmentPayload {
  handles: { count: number; grams: number }
  plates: { grams: number; count: number }[]
  fixed: { grams: number; count: number; label: string }[]
  bands: { label: string; resistance: string | null; count: number }[]
}

// --- Form state (text, so typing stays natural) ------------------------------
interface PlateRow { key: number; kg: string; count: string }
interface FixedRow { key: number; label: string; kg: string; count: string }
interface BandRow { key: number; label: string; resistance: string; count: string }

let nextKey = 1
const handleCount = ref('0')
const handleKg = ref('0')
const plateRows = ref<PlateRow[]>([])
const fixedRows = ref<FixedRow[]>([])
const bandRows = ref<BandRow[]>([])

function fillForm(data: EquipmentPayload) {
  handleCount.value = String(data.handles.count)
  handleKg.value = gramsToKg(data.handles.grams, 3)
  plateRows.value = data.plates.map((p) => ({ key: nextKey++, kg: gramsToKg(p.grams, 3), count: String(p.count) }))
  fixedRows.value = data.fixed.map((f) => ({ key: nextKey++, label: f.label, kg: gramsToKg(f.grams, 3), count: String(f.count) }))
  bandRows.value = data.bands.map((b) => ({ key: nextKey++, label: b.label, resistance: b.resistance ?? '', count: String(b.count) }))
}

function addFixed() { fixedRows.value.push({ key: nextKey++, label: '', kg: '', count: '1' }) }
function addBand() { bandRows.value.push({ key: nextKey++, label: '', resistance: '', count: '1' }) }
function removePlate(key: number) { plateRows.value = plateRows.value.filter((r) => r.key !== key) }
function removeFixed(key: number) { fixedRows.value = fixedRows.value.filter((r) => r.key !== key) }
function removeBand(key: number) { bandRows.value = bandRows.value.filter((r) => r.key !== key) }

// --- Validation + conversion to grams -------------------------------------------
const showErrors = ref(false)

/** Parses a kg text field. Returns grams or an error message. */
function weight(text: string, maxGrams: number, allowZero: boolean): { grams: number } | { error: string } {
  const grams = kgToGrams(text)
  if (grams === null) return { error: t('equipment.errors.weight') }
  if (!allowZero && grams === 0) return { error: t('equipment.errors.weightPositive') }
  if (grams > maxGrams) return { error: t('equipment.errors.weightMax', { max: gramsToKg(maxGrams) }) }
  return { grams }
}

function count(text: string, min: number, max: number): { value: number } | { error: string } {
  const value = parseCount(text)
  if (value === null) return { error: t('equipment.errors.count') }
  if (value < min || value > max) return { error: t('equipment.errors.countRange', { min, max }) }
  return { value }
}

function label(text: string, required: boolean): string | null {
  const length = text.trim().length
  if (required ? length < 1 || length > L.label : length > L.label) {
    return required ? t('equipment.errors.label', { max: L.label }) : t('equipment.errors.resistance', { max: L.label })
  }
  return null
}

/**
 * One pass over the form: the payload to save (null when anything is invalid),
 * per-field error messages, and the valid-rows-only equipment for the live panel.
 */
const parsed = computed(() => {
  const errors: Record<string, string> = {}
  const fail = (field: string, result: { error: string } | object) => {
    if ('error' in result) errors[field] = result.error
  }

  // Handles
  const hc = count(handleCount.value, 0, L.handleCount)
  const hw = weight(handleKg.value, L.handleGrams, true)
  fail('handleCount', hc)
  fail('handleKg', hw)
  const handles = 'value' in hc && 'grams' in hw ? { count: hc.value, grams: hw.grams } : null

  // Plates
  const plates: EquipmentPayload['plates'] = []
  for (const row of plateRows.value) {
    const w = weight(row.kg, L.plateGrams, false)
    const c = count(row.count, 1, L.count)
    fail(`p${row.key}kg`, w)
    fail(`p${row.key}count`, c)
    if ('grams' in w && 'value' in c) plates.push({ grams: w.grams, count: c.value })
  }
  // The load calculator slows down sharply with many plates (see shared/utils/equipmentLimits.ts).
  // Over the cap it isn't run at all: the live panel would freeze the page.
  const plateTotal = plates.reduce((sum, p) => sum + p.count, 0)
  const tooManyPlates = plateTotal > L.plateTotal
  if (tooManyPlates) errors.plateTotal = t('equipment.errors.plateTotal', { max: L.plateTotal, total: plateTotal })

  // Fixed weights
  const fixed: EquipmentPayload['fixed'] = []
  for (const row of fixedRows.value) {
    const labelError = label(row.label, true)
    const w = weight(row.kg, L.fixedGrams, false)
    const c = count(row.count, 1, L.count)
    if (labelError) errors[`f${row.key}label`] = labelError
    fail(`f${row.key}kg`, w)
    fail(`f${row.key}count`, c)
    if (!labelError && 'grams' in w && 'value' in c) fixed.push({ grams: w.grams, count: c.value, label: row.label.trim() })
  }

  // Bands
  const bands: EquipmentPayload['bands'] = []
  for (const row of bandRows.value) {
    const labelError = label(row.label, true)
    const resistanceError = label(row.resistance, false)
    const c = count(row.count, 1, L.count)
    if (labelError) errors[`b${row.key}label`] = labelError
    if (resistanceError) errors[`b${row.key}resistance`] = resistanceError
    fail(`b${row.key}count`, c)
    if (!labelError && !resistanceError && 'value' in c) {
      bands.push({ label: row.label.trim(), resistance: row.resistance.trim() || null, count: c.value })
    }
  }

  const valid = Object.keys(errors).length === 0 && handles !== null
  const payload: EquipmentPayload | null = valid ? { handles, plates, fixed, bands } : null
  // Live panel: whatever is valid so far, so one half-typed row doesn't blank it.
  const equipment: Equipment = { handles: handles ?? { count: 0, grams: 0 }, plates: tooManyPlates ? [] : plates, fixed }
  return { errors, payload, equipment, hasSkippedRows: !valid, plateTotalError: errors.plateTotal ?? null }
})

/** Error for a field, shown only after the first failed save attempt. */
function err(field: string): string | null {
  return showErrors.value ? (parsed.value.errors[field] ?? null) : null
}

// --- Loads you can build (computed once; feeds the summary and the save bar) ---
const loads = computed(() => {
  try {
    // A 0 kg "load" (empty unweighed handle) isn't something to train with, so leave it out.
    const options = buildableLoads(parsed.value.equipment).filter((o) => o.grams > 0)
    return { options, summary: summarizeLoads(options), failed: false }
  } catch {
    // buildableLoads throws RangeError on bad input; show a message instead of crashing the page.
    return { options: [], summary: summarizeLoads([]), failed: true }
  }
})

const handlesUnweighed = computed(() => parsed.value.equipment.handles.count > 0 && parsed.value.equipment.handles.grams === 0)

// --- Plates: one-tap presets + steppers -----------------------------------------
/** Plates in the form right now, counting what's typed even if another row is invalid. */
const plateTotalNow = computed(() => plateRows.value.reduce((sum, r) => sum + (parseCount(r.count) ?? 0), 0))
const plateTypesFull = computed(() => plateRows.value.length >= L.plateTypes)
const platesFull = computed(() => plateTotalNow.value >= L.plateTotal)

function plateRowFor(grams: number): PlateRow | undefined {
  return plateRows.value.find((r) => kgToGrams(r.kg) === grams)
}

/** Whether one more plate of this weight fits within every limit. */
function canAddPlate(grams: number): boolean {
  if (platesFull.value) return false
  const existing = plateRowFor(grams)
  if (existing) return (parseCount(existing.count) ?? 0) < L.count
  return !plateTypesFull.value
}

/** Adds one plate of this weight: bumps the row if there is one, else starts a row. */
function addPlate(grams: number) {
  if (!canAddPlate(grams)) return
  const existing = plateRowFor(grams)
  if (existing) existing.count = String((parseCount(existing.count) ?? 0) + 1)
  else plateRows.value.push({ key: nextKey++, kg: gramsToKg(grams, 3), count: '1' })
}

/** How high this row's stepper may go: its own cap, and what's left of the total. */
function plateMax(row: PlateRow): number {
  const own = parseCount(row.count) ?? 1
  return Math.max(own, Math.min(L.count, own + (L.plateTotal - plateTotalNow.value)))
}

const customOpen = ref(false)
const customKg = ref('')
const customError = ref('')

function openCustom() {
  customOpen.value = true
  customError.value = ''
}

function addCustomPlate() {
  const result = weight(customKg.value, L.plateGrams, false)
  if ('error' in result) {
    customError.value = result.error
    return
  }
  if (!canAddPlate(result.grams)) {
    customError.value = t('equipment.limitReached', { max: platesFull.value ? L.plateTotal : plateTypesFull.value ? L.plateTypes : L.count })
    return
  }
  addPlate(result.grams)
  customKg.value = ''
  customError.value = ''
  customOpen.value = false
}

function cancelCustom() {
  customOpen.value = false
  customKg.value = ''
  customError.value = ''
}

// --- Load + save --------------------------------------------------------------
type LoadState = 'loading' | 'ready' | 'error'
const loadState = ref<LoadState>('loading')
const savedSnapshot = ref('')

const saving = ref(false)
const justSaved = ref(false)
const saveError = ref('')
const formEl = ref<HTMLFormElement | null>(null)
const errorEl = ref<HTMLElement | null>(null)
let savedTimer: ReturnType<typeof setTimeout> | undefined

// Unsaved when anything differs from what the server last had (or can't be parsed yet).
const dirty = computed(() => {
  const payload = parsed.value.payload
  return payload === null || JSON.stringify(payload) !== savedSnapshot.value
})

function applyFromServer(data: EquipmentPayload) {
  fillForm(data)
  showErrors.value = false
  // Snapshot what the form turns this into, so "dirty" compares like with like.
  savedSnapshot.value = JSON.stringify(parsed.value.payload)
}

async function load() {
  loadState.value = 'loading'
  try {
    applyFromServer(await $fetch<EquipmentPayload>(EQUIPMENT_URL))
    loadState.value = 'ready'
  } catch {
    loadState.value = 'error'
  }
}

onMounted(load)
onBeforeUnmount(() => clearTimeout(savedTimer))

// Pull down to refresh. Never replaces what the user is editing: with unsaved changes
// the form is left alone. A failure throws so the pull shows "couldn't refresh".
onPullRefresh(async () => {
  if (loadState.value === 'error') return load()
  if (loadState.value !== 'ready' || dirty.value || saving.value) return
  applyFromServer(await $fetch<EquipmentPayload>(EQUIPMENT_URL))
})

async function save() {
  if (saving.value) return
  saveError.value = ''
  justSaved.value = false

  const payload = parsed.value.payload
  if (!payload) {
    showErrors.value = true
    await nextTick()
    formEl.value?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
    return
  }

  saving.value = true
  try {
    const saved = await $fetch<EquipmentPayload>(EQUIPMENT_URL, { method: 'PUT', body: payload })
    applyFromServer(saved)
    justSaved.value = true
    clearTimeout(savedTimer)
    savedTimer = setTimeout(() => (justSaved.value = false), 3000)
  } catch (e: unknown) {
    const code = serverMessage(e)
    saveError.value = code === 'invalid_input' || code === 'equipment_too_large'
      ? t(`equipment.errors.${code}`)
      : t('equipment.errors.generic')
    await nextTick()
    errorEl.value?.focus()
  } finally {
    saving.value = false
  }
}

// The next edit clears the "saved" confirmation.
watch(dirty, (isDirty) => { if (isDirty) justSaved.value = false })

const barStatus = computed(() => (dirty.value ? t('equipment.unsaved') : t('equipment.upToDate')))
const barLoads = computed(() => {
  if (loads.value.failed) return t('equipment.loads.errorShort')
  if (!loads.value.summary.count) return t('equipment.loads.none')
  return t('equipment.loads.headline', { n: loads.value.summary.count }, loads.value.summary.count)
})
</script>

<template>
  <main class="eq">
    <NuxtLink to="/" class="eq__back">&larr; {{ t('equipment.back') }}</NuxtLink>
    <h1 class="vf-display eq__title">{{ t('equipment.title') }}</h1>
    <p class="vf-muted eq__intro">{{ t('equipment.intro') }}</p>

    <!-- Loading ------------------------------------------------------------>
    <EquipmentSkeleton v-if="loadState === 'loading'" />

    <!-- Load error ----------------------------------------------------------->
    <UiCard v-else-if="loadState === 'error'">
      <p class="eq__alert eq__alert--error" role="alert">{{ t('equipment.loadError') }}</p>
      <UiButton variant="secondary" full-width @click="load">{{ t('equipment.retry') }}</UiButton>
    </UiCard>

    <!-- Result first, then the gear, then the pinned save bar ------------------>
    <form v-else ref="formEl" class="eq__stack vf-reveal" novalidate @submit.prevent="save">
      <EquipmentLoadsPanel
        :options="loads.options"
        :summary="loads.summary"
        :failed="loads.failed"
        :handles-unweighed="handlesUnweighed"
        :has-skipped-rows="parsed.hasSkippedRows"
      />

      <!-- Handles -->
      <UiCard>
        <h2 class="vf-label eq__section-label">{{ t('equipment.handles.title') }}</h2>
        <p class="vf-muted eq__section-hint">{{ t('equipment.handles.hint') }}</p>
        <div class="eq__count-line">
          <span class="vf-label">{{ t('equipment.handles.count') }}</span>
          <EquipmentCountStepper v-model="handleCount" :min="0" :max="L.handleCount" :what="t('equipment.handles.what')" />
        </div>
        <EquipmentNumberInput
          v-model="handleKg"
          mode="kg"
          :unit="t('equipment.kg')"
          :label="t('equipment.handles.weight')"
          :error="err('handleKg')"
        />
        <p class="vf-muted eq__section-hint eq__after">{{ t('equipment.handles.weightHint') }}</p>
      </UiCard>

      <!-- Plates -->
      <UiCard>
        <h2 class="vf-label eq__section-label">{{ t('equipment.plates.title') }}</h2>
        <p class="vf-muted eq__section-hint">{{ t('equipment.plates.hint') }}</p>

        <p v-if="!plateRows.length" class="vf-muted eq__empty">{{ t('equipment.plates.empty') }}</p>
        <ul v-else class="eq__plates">
          <li v-for="row in plateRows" :key="row.key" class="eq__plate">
            <span class="eq__plate-weight vf-num">{{ t('equipment.loads.kg', { kg: row.kg }) }}</span>
            <EquipmentCountStepper
              v-model="row.count"
              :min="1"
              :max="plateMax(row)"
              :what="t('equipment.plates.rowWeight', { kg: row.kg })"
            />
            <EquipmentRemoveButton
              :label="t('equipment.remove', { what: t('equipment.plates.rowWeight', { kg: row.kg }) })"
              @click="removePlate(row.key)"
            />
            <p v-if="err(`p${row.key}kg`) || err(`p${row.key}count`)" class="eq__row-error" role="alert">
              {{ err(`p${row.key}kg`) || err(`p${row.key}count`) }}
            </p>
          </li>
        </ul>

        <!-- One tap adds a plate of that weight (or one more of it). -->
        <p id="eq-quick-label" class="vf-label eq__quick-label">{{ t('equipment.plates.quickAdd') }}</p>
        <div class="eq__chips" role="group" aria-labelledby="eq-quick-label">
          <button
            v-for="grams in COMMON_PLATE_GRAMS"
            :key="grams"
            type="button"
            class="eq__chip vf-num"
            :disabled="!canAddPlate(grams)"
            :aria-label="t('equipment.plates.addPreset', { kg: gramsToKg(grams) })"
            @click="addPlate(grams)"
          >
            {{ t('equipment.loads.kg', { kg: gramsToKg(grams) }) }}
          </button>
          <button
            v-if="!customOpen"
            type="button"
            class="eq__chip eq__chip--other"
            :disabled="platesFull || plateTypesFull"
            @click="openCustom"
          >
            {{ t('equipment.plates.other') }}
          </button>
        </div>

        <!-- Any other weight: typed once, then it's a row like the rest. -->
        <div v-if="customOpen" class="eq__custom" @keydown.enter.prevent="addCustomPlate">
          <EquipmentNumberInput
            v-model="customKg"
            mode="kg"
            :unit="t('equipment.kg')"
            :label="t('equipment.plates.weight')"
            :error="customError"
          />
          <div class="eq__custom-actions">
            <UiButton variant="secondary" @click="cancelCustom">{{ t('equipment.cancel') }}</UiButton>
            <UiButton @click="addCustomPlate">{{ t('equipment.add') }}</UiButton>
          </div>
        </div>

        <p v-if="plateTypesFull" class="vf-muted eq__section-hint eq__after">{{ t('equipment.limitReached', { max: L.plateTypes }) }}</p>
        <!-- Shown right away, not only after Save: it also explains why the loads panel left plates out. -->
        <p v-if="parsed.plateTotalError" class="eq__section-hint eq__after eq__plate-total" role="alert">{{ parsed.plateTotalError }}</p>
        <p v-else-if="platesFull" class="vf-muted eq__section-hint eq__after">{{ t('equipment.plates.totalFull', { max: L.plateTotal }) }}</p>
      </UiCard>

      <!-- Fixed weights -->
      <UiCard>
        <h2 class="vf-label eq__section-label">{{ t('equipment.fixed.title') }}</h2>
        <p class="vf-muted eq__section-hint">{{ t('equipment.fixed.hint') }}</p>
        <p v-if="!fixedRows.length" class="vf-muted eq__empty">{{ t('equipment.fixed.empty') }}</p>
        <ul class="eq__rows">
          <li v-for="(row, i) in fixedRows" :key="row.key" class="eq__row">
            <UiField
              v-model="row.label"
              :label="t('equipment.fixed.label')"
              :maxlength="L.label"
              :error="err(`f${row.key}label`)"
            />
            <EquipmentRemoveButton
              :label="t('equipment.remove', { what: row.label.trim() || t('equipment.fixed.row', { n: i + 1 }) })"
              @click="removeFixed(row.key)"
            />
            <EquipmentNumberInput
              v-model="row.kg"
              class="eq__span"
              mode="kg"
              :unit="t('equipment.kg')"
              :label="t('equipment.fixed.weight')"
              :error="err(`f${row.key}kg`)"
            />
            <div class="eq__count-line eq__span">
              <span class="vf-label">{{ t('equipment.fixed.count') }}</span>
              <EquipmentCountStepper
                v-model="row.count"
                :min="1"
                :max="L.count"
                :what="row.label.trim() || t('equipment.fixed.row', { n: i + 1 })"
              />
            </div>
          </li>
        </ul>
        <UiButton variant="secondary" full-width :disabled="fixedRows.length >= L.fixedTypes" @click="addFixed">
          <span class="eq__add"><Plus :size="20" aria-hidden="true" />{{ t('equipment.fixed.add') }}</span>
        </UiButton>
        <p v-if="fixedRows.length >= L.fixedTypes" class="vf-muted eq__section-hint eq__after">{{ t('equipment.limitReached', { max: L.fixedTypes }) }}</p>
      </UiCard>

      <!-- Bands -->
      <UiCard>
        <h2 class="vf-label eq__section-label">{{ t('equipment.bands.title') }}</h2>
        <p class="vf-muted eq__section-hint">{{ t('equipment.bands.hint') }}</p>
        <p v-if="!bandRows.length" class="vf-muted eq__empty">{{ t('equipment.bands.empty') }}</p>
        <ul class="eq__rows">
          <li v-for="(row, i) in bandRows" :key="row.key" class="eq__row">
            <UiField
              v-model="row.label"
              :label="t('equipment.bands.label')"
              :maxlength="L.label"
              :error="err(`b${row.key}label`)"
            />
            <EquipmentRemoveButton
              :label="t('equipment.remove', { what: row.label.trim() || t('equipment.bands.row', { n: i + 1 }) })"
              @click="removeBand(row.key)"
            />
            <UiField
              v-model="row.resistance"
              class="eq__span"
              :label="t('equipment.bands.resistance')"
              :hint="t('equipment.bands.resistanceHint')"
              :maxlength="L.label"
              :error="err(`b${row.key}resistance`)"
            />
            <div class="eq__count-line eq__span">
              <span class="vf-label">{{ t('equipment.bands.count') }}</span>
              <EquipmentCountStepper
                v-model="row.count"
                :min="1"
                :max="L.count"
                :what="row.label.trim() || t('equipment.bands.row', { n: i + 1 })"
              />
            </div>
          </li>
        </ul>
        <UiButton variant="secondary" full-width :disabled="bandRows.length >= L.bandTypes" @click="addBand">
          <span class="eq__add"><Plus :size="20" aria-hidden="true" />{{ t('equipment.bands.add') }}</span>
        </UiButton>
        <p v-if="bandRows.length >= L.bandTypes" class="vf-muted eq__section-hint eq__after">{{ t('equipment.limitReached', { max: L.bandTypes }) }}</p>
      </UiCard>

      <!-- Save bar: pinned above the tab bar so Save is always in reach, and it keeps the
           live count in view while you edit. -->
      <div class="eq__bar">
        <p v-if="saveError" ref="errorEl" class="eq__alert eq__alert--error" role="alert" tabindex="-1">{{ saveError }}</p>
        <p v-else-if="showErrors && !parsed.payload" class="eq__alert eq__alert--error" role="alert">{{ t('equipment.fixErrors') }}</p>
        <p v-else-if="justSaved" class="eq__alert eq__alert--notice" role="status">{{ t('equipment.saved') }}</p>
        <div class="eq__bar-row">
          <p class="eq__status" role="status">
            <span class="eq__status-main">{{ barStatus }}</span>
            <span class="eq__status-loads vf-muted">{{ barLoads }}</span>
          </p>
          <UiButton type="submit" :loading="saving" :disabled="!dirty">{{ t('equipment.save') }}</UiButton>
        </div>
      </div>
    </form>
  </main>
</template>

<style scoped>
.eq {
  display: flex;
  flex-direction: column;
  gap: var(--vf-space-2);
  max-width: var(--vf-width-page);
  margin: 0 auto;
  /* No bottom padding: the pinned save bar is the last thing and sits flush on the tab bar. */
  padding: var(--vf-space-6) var(--vf-space-4) 0;
}

.eq__back {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  min-height: var(--vf-tap-min);
  color: var(--vf-color-accent-text);
  font-weight: var(--vf-weight-semibold);
  text-decoration: none;
}

.eq__title {
  font-size: var(--vf-text-display);
}

.eq__intro {
  margin: 0 0 var(--vf-space-4);
}

.eq__stack {
  display: flex;
  flex-direction: column;
  gap: var(--vf-space-4);
}

.eq__section-label {
  margin-bottom: var(--vf-space-1);
}

.eq__section-hint {
  margin: 0 0 var(--vf-space-4);
  font-size: var(--vf-text-sm);
}

.eq__after {
  margin: var(--vf-space-3) 0 0;
}

.eq__plate-total {
  color: var(--vf-color-hard);
}

.eq__empty {
  margin: 0 0 var(--vf-space-4);
}

.eq__add {
  display: inline-flex;
  align-items: center;
  gap: var(--vf-space-2);
}

/* "How many": the label on the left, the stepper on the right. */
.eq__count-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--vf-space-3);
  margin-bottom: var(--vf-space-3);
}

/* Plates: weight, stepper, remove. One compact line each. */
.eq__plates {
  list-style: none;
  margin: 0 0 var(--vf-space-4);
  padding: 0;
  display: flex;
  flex-direction: column;
}

.eq__plate {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--vf-space-2);
  padding: var(--vf-space-2) 0;
  border-top: var(--vf-border-thin) solid var(--vf-color-border);
}

.eq__plate:last-child {
  border-bottom: var(--vf-border-thin) solid var(--vf-color-border);
}

.eq__plate-weight {
  flex: 1;
  min-width: 0;
  font-size: var(--vf-text-xl);
}

.eq__row-error {
  flex-basis: 100%;
  margin: 0;
  color: var(--vf-color-hard);
  font-size: var(--vf-text-sm);
  font-weight: var(--vf-weight-semibold);
}

.eq__quick-label {
  margin: 0 0 var(--vf-space-2);
}

.eq__chips {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--vf-space-2);
}

.eq__chip {
  min-height: var(--vf-tap-min);
  padding: 0 var(--vf-space-1);
  border: var(--vf-border) solid var(--vf-color-control-border);
  border-radius: var(--vf-radius);
  background: var(--vf-color-surface);
  color: var(--vf-color-text);
  font-size: var(--vf-text-base);
  cursor: pointer;
  transition: opacity var(--vf-duration-base) var(--vf-ease), border-color var(--vf-duration-base) var(--vf-ease);
}

.eq__chip:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.eq__chip--other {
  font-family: var(--vf-font-body);
  font-weight: var(--vf-weight-semibold);
  color: var(--vf-color-accent-text);
}

.eq__custom {
  display: flex;
  flex-direction: column;
  gap: var(--vf-space-3);
  margin-top: var(--vf-space-4);
}

.eq__custom-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--vf-space-3);
}

/* Fixed weights and bands: name + remove on top, the rest below. */
.eq__rows {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--vf-space-4);
}

.eq__rows:not(:empty) {
  margin-bottom: var(--vf-space-4);
}

.eq__row {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: start;
  gap: var(--vf-space-3);
  padding-bottom: var(--vf-space-4);
  border-bottom: var(--vf-border-thin) solid var(--vf-color-border);
}

/* Remove button sits level with the input box, below the small label. */
.eq__row :deep(.eq-remove) {
  margin-top: calc(var(--vf-text-xs) * var(--vf-leading-normal) + var(--vf-space-2));
}

.eq__span {
  grid-column: 1 / -1;
}

.eq__row .eq__count-line {
  margin-bottom: 0;
}

.eq__alert {
  margin: 0;
  padding: var(--vf-space-3);
  border-radius: var(--vf-radius);
  font-size: var(--vf-text-sm);
}

.eq__alert--error {
  border: var(--vf-border) solid var(--vf-color-hard);
  background: var(--vf-color-surface);
  color: var(--vf-color-hard);
  font-weight: var(--vf-weight-semibold);
}

.eq__alert--notice {
  background: var(--vf-color-chip-bg);
  color: var(--vf-color-text);
}

/* Pinned just above the tab bar (--vf-tabbar-h is published by the tabs layout). */
.eq__bar {
  position: sticky;
  bottom: var(--vf-tabbar-h, 0px);
  z-index: var(--vf-z-tabbar);
  display: flex;
  flex-direction: column;
  gap: var(--vf-space-2);
  margin: 0 calc(-1 * var(--vf-space-4));
  padding: var(--vf-space-3) var(--vf-space-4);
  border-top: var(--vf-border-thin) solid var(--vf-color-border);
  background: var(--vf-color-surface);
}

.eq__bar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--vf-space-3);
}

.eq__status {
  display: flex;
  flex-direction: column;
  min-width: 0;
  margin: 0;
}

.eq__status-main {
  font-weight: var(--vf-weight-semibold);
  font-size: var(--vf-text-sm);
}

.eq__status-loads {
  font-size: var(--vf-text-sm);
}
</style>
