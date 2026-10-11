<script setup lang="ts">
/**
 * Equipment screen: the user enters the gear they own and sees, live, every
 * load that gear can build. Weights are typed in kg and converted to integer
 * grams right away (non-negotiable #2); the form keeps text so half-typed
 * numbers like "1." don't fight the user.
 */
import { Plus } from 'lucide-vue-next'
import type { Equipment } from '~~/shared/utils/loads'
import { EQUIPMENT_LIMITS } from '~~/shared/utils/equipmentLimits'

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

function addPlate() { plateRows.value.push({ key: nextKey++, kg: '', count: '2' }) }
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
</script>

<template>
  <main class="eq">
    <NuxtLink to="/" class="eq__back">&larr; {{ t('equipment.back') }}</NuxtLink>
    <h1 class="vf-display eq__title">{{ t('equipment.title') }}</h1>
    <p class="vf-muted eq__intro">{{ t('equipment.intro') }}</p>

    <!-- Loading ------------------------------------------------------------>
    <div v-if="loadState === 'loading'" class="eq__stack" role="status" :aria-label="t('equipment.loading')">
      <div v-for="n in 3" :key="n" class="eq__skeleton" aria-hidden="true" />
      <span class="vf-visually-hidden">{{ t('equipment.loading') }}</span>
    </div>

    <!-- Load error ----------------------------------------------------------->
    <UiCard v-else-if="loadState === 'error'">
      <p class="eq__alert eq__alert--error" role="alert">{{ t('equipment.loadError') }}</p>
      <UiButton variant="secondary" full-width @click="load">{{ t('equipment.retry') }}</UiButton>
    </UiCard>

    <!-- Form + live panel -------------------------------------------------------->
    <form v-else ref="formEl" class="eq__stack" novalidate @submit.prevent="save">
      <!-- Handles -->
      <UiCard>
        <h2 class="vf-label eq__section-label">{{ t('equipment.handles.title') }}</h2>
        <p class="vf-muted eq__section-hint">{{ t('equipment.handles.hint') }}</p>
        <div class="eq__grid">
          <EquipmentNumberInput v-model="handleCount" mode="count" :label="t('equipment.handles.count')" :error="err('handleCount')" />
          <EquipmentNumberInput
            v-model="handleKg"
            mode="kg"
            :unit="t('equipment.kg')"
            :label="t('equipment.handles.weight')"
            :error="err('handleKg')"
          />
        </div>
        <p class="vf-muted eq__section-hint eq__after">{{ t('equipment.handles.weightHint') }}</p>
      </UiCard>

      <!-- Plates -->
      <UiCard>
        <h2 class="vf-label eq__section-label">{{ t('equipment.plates.title') }}</h2>
        <p class="vf-muted eq__section-hint">{{ t('equipment.plates.hint') }}</p>
        <p v-if="!plateRows.length" class="vf-muted eq__empty">{{ t('equipment.plates.empty') }}</p>
        <ul class="eq__rows">
          <li v-for="(row, i) in plateRows" :key="row.key" class="eq__row">
            <EquipmentNumberInput
              v-model="row.kg"
              mode="kg"
              :unit="t('equipment.kg')"
              :label="t('equipment.plates.weight')"
              :error="err(`p${row.key}kg`)"
            />
            <EquipmentNumberInput v-model="row.count" mode="count" :label="t('equipment.plates.count')" :error="err(`p${row.key}count`)" />
            <EquipmentRemoveButton
              :label="t('equipment.remove', { what: t('equipment.plates.row', { n: i + 1 }) })"
              @click="removePlate(row.key)"
            />
          </li>
        </ul>
        <UiButton variant="secondary" full-width :disabled="plateRows.length >= L.plateTypes" @click="addPlate">
          <span class="eq__add"><Plus :size="20" aria-hidden="true" />{{ t('equipment.plates.add') }}</span>
        </UiButton>
        <p v-if="plateRows.length >= L.plateTypes" class="vf-muted eq__section-hint eq__after">{{ t('equipment.limitReached', { max: L.plateTypes }) }}</p>
        <!-- Shown right away, not only after Save: it also explains why the loads panel left plates out. -->
        <p v-if="parsed.plateTotalError" class="eq__section-hint eq__after eq__plate-total" role="alert">{{ parsed.plateTotalError }}</p>
      </UiCard>

      <!-- Fixed weights -->
      <UiCard>
        <h2 class="vf-label eq__section-label">{{ t('equipment.fixed.title') }}</h2>
        <p class="vf-muted eq__section-hint">{{ t('equipment.fixed.hint') }}</p>
        <p v-if="!fixedRows.length" class="vf-muted eq__empty">{{ t('equipment.fixed.empty') }}</p>
        <ul class="eq__rows">
          <li v-for="(row, i) in fixedRows" :key="row.key" class="eq__row eq__row--wide">
            <UiField
              v-model="row.label"
              class="eq__span"
              :label="t('equipment.fixed.label')"
              :maxlength="L.label"
              :error="err(`f${row.key}label`)"
            />
            <EquipmentNumberInput
              v-model="row.kg"
              mode="kg"
              :unit="t('equipment.kg')"
              :label="t('equipment.fixed.weight')"
              :error="err(`f${row.key}kg`)"
            />
            <EquipmentNumberInput v-model="row.count" mode="count" :label="t('equipment.fixed.count')" :error="err(`f${row.key}count`)" />
            <EquipmentRemoveButton
              :label="t('equipment.remove', { what: row.label.trim() || t('equipment.fixed.row', { n: i + 1 }) })"
              @click="removeFixed(row.key)"
            />
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
          <li v-for="(row, i) in bandRows" :key="row.key" class="eq__row eq__row--wide">
            <UiField
              v-model="row.label"
              class="eq__span"
              :label="t('equipment.bands.label')"
              :maxlength="L.label"
              :error="err(`b${row.key}label`)"
            />
            <UiField
              v-model="row.resistance"
              class="eq__span"
              :label="t('equipment.bands.resistance')"
              :hint="t('equipment.bands.resistanceHint')"
              :maxlength="L.label"
              :error="err(`b${row.key}resistance`)"
            />
            <EquipmentNumberInput v-model="row.count" mode="count" :label="t('equipment.bands.count')" :error="err(`b${row.key}count`)" />
            <EquipmentRemoveButton
              class="eq__row-end"
              :label="t('equipment.remove', { what: row.label.trim() || t('equipment.bands.row', { n: i + 1 }) })"
              @click="removeBand(row.key)"
            />
          </li>
        </ul>
        <UiButton variant="secondary" full-width :disabled="bandRows.length >= L.bandTypes" @click="addBand">
          <span class="eq__add"><Plus :size="20" aria-hidden="true" />{{ t('equipment.bands.add') }}</span>
        </UiButton>
        <p v-if="bandRows.length >= L.bandTypes" class="vf-muted eq__section-hint eq__after">{{ t('equipment.limitReached', { max: L.bandTypes }) }}</p>
      </UiCard>

      <!-- Live result -->
      <EquipmentLoadsPanel :equipment="parsed.equipment" :has-skipped-rows="parsed.hasSkippedRows" />

      <!-- Save -->
      <div class="eq__save">
        <p v-if="saveError" ref="errorEl" class="eq__alert eq__alert--error" role="alert" tabindex="-1">{{ saveError }}</p>
        <p v-else-if="showErrors && !parsed.payload" class="eq__alert eq__alert--error" role="alert">{{ t('equipment.fixErrors') }}</p>
        <p v-else-if="justSaved" class="eq__alert eq__alert--notice" role="status">{{ t('equipment.saved') }}</p>
        <p v-else class="vf-muted eq__status" role="status">{{ dirty ? t('equipment.unsaved') : t('equipment.upToDate') }}</p>
        <UiButton type="submit" full-width :loading="saving" :disabled="!dirty">{{ t('equipment.save') }}</UiButton>
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
  padding: var(--vf-space-6) var(--vf-space-4) var(--vf-space-16);
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

.eq__skeleton {
  height: calc(var(--vf-space-16) * 2);
  border-radius: var(--vf-radius);
  background: var(--vf-color-chip-bg);
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

.eq__grid {
  align-items: end;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--vf-space-3);
}

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

/* Each row: inputs side by side, remove button at the end, aligned to the inputs. */
.eq__row {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  align-items: start;
  gap: var(--vf-space-3);
  padding-bottom: var(--vf-space-4);
  border-bottom: var(--vf-border-thin) solid var(--vf-color-border);
}

/* Remove button sits level with the input boxes, below the small label. */
.eq__row :deep(.eq-remove) {
  margin-top: calc(var(--vf-text-xs) * var(--vf-leading-normal) + var(--vf-space-2));
}

/* Rows with a text field on top: it spans the full width. */
.eq__span {
  grid-column: 1 / -1;
}

/* Bands: count + remove share the second line. */
.eq__row-end {
  grid-column: 3;
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

.eq__save {
  display: flex;
  flex-direction: column;
  gap: var(--vf-space-3);
}

.eq__status {
  margin: 0;
  font-size: var(--vf-text-sm);
  text-align: center;
}
</style>
