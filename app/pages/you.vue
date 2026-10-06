<script setup lang="ts">
/**
 * Minimal account page: name, appearance, change password, sign out, and
 * delete account. No tab bar yet (the other tabs don't exist), so this is a
 * plain page, reachable only once signed in (enforced by auth.global.ts).
 */
import { passwordProblems } from '~~/shared/utils/password'
import type { AuthUser } from '~/composables/useAuthUser'

const { t } = useI18n()
const user = useAuthUser()

// Plain `string`s (not path literals) keep TS from walking Nitro's typed
// route map — with this many /api/auth/* routes that literal-matching blows
// TS's recursion limit ("excessive stack depth").
const ME_URL: string = '/api/auth/me'
const PASSWORD_URL: string = '/api/auth/password'
const LOGOUT_URL: string = '/api/auth/logout'
const ACCOUNT_URL: string = '/api/auth/account'

// --- Name -------------------------------------------------------------
const name = ref(user.value?.name ?? '')
const nameError = ref('')
const nameBusy = ref(false)
const nameSaved = ref(false)
const nameField = ref<{ focus: () => void } | null>(null)
let nameSavedTimer: ReturnType<typeof setTimeout> | undefined

async function saveName() {
  if (nameBusy.value) return
  nameError.value = ''
  nameSaved.value = false
  nameBusy.value = true
  try {
    const clean = name.value.trim() || null
    const updated = await $fetch<AuthUser>(ME_URL, { method: 'PATCH', body: { name: clean } })
    user.value = updated
    name.value = updated.name ?? ''
    nameSaved.value = true
    clearTimeout(nameSavedTimer)
    nameSavedTimer = setTimeout(() => (nameSaved.value = false), 3000)
  } catch (e: unknown) {
    const code = serverMessage(e)
    const data = serverErrorData(e)
    nameError.value = code === 'name_too_long'
      ? t('auth.errors.name_too_long', { max: data.max })
      : t('auth.errors.generic')
    await nextTick()
    nameField.value?.focus()
  } finally {
    nameBusy.value = false
  }
}

// --- Change password ----------------------------------------------------
const currentPassword = ref('')
const newPassword = ref('')
const passwordFormError = ref('')
const currentPasswordError = ref('')
const newPasswordError = ref('')
const passwordBusy = ref(false)
const passwordSaved = ref(false)
const currentPasswordField = ref<{ focus: () => void } | null>(null)
const newPasswordField = ref<{ focus: () => void } | null>(null)
const passwordAlertEl = ref<HTMLElement | null>(null)

const newPasswordValid = computed(() => passwordProblems(newPassword.value).length === 0)

async function changePassword() {
  if (passwordBusy.value) return
  passwordFormError.value = ''
  currentPasswordError.value = ''
  newPasswordError.value = ''
  passwordSaved.value = false
  passwordBusy.value = true
  try {
    await $fetch(PASSWORD_URL, {
      method: 'POST',
      body: { current: currentPassword.value, next: newPassword.value },
    })
    currentPassword.value = ''
    newPassword.value = ''
    passwordSaved.value = true
  } catch (e: unknown) {
    const code = serverMessage(e)
    const data = serverErrorData(e)

    if (code === 'wrong_password') {
      currentPasswordError.value = t('auth.errors.wrong_password')
    } else if (code === 'weak_password') {
      newPasswordError.value = t('auth.errors.weak_password')
    } else if (code === 'password_too_long') {
      newPasswordError.value = t('auth.errors.password_too_long')
    } else if (code === 'rate_limited') {
      const seconds = Number(data.retryAfter ?? 0)
      passwordFormError.value = t('auth.errors.rate_limited', { minutes: Math.max(1, Math.ceil(seconds / 60)) })
    } else {
      passwordFormError.value = t('auth.errors.generic')
    }

    await nextTick()
    if (currentPasswordError.value) currentPasswordField.value?.focus()
    else if (newPasswordError.value) newPasswordField.value?.focus()
    else passwordAlertEl.value?.focus()
  } finally {
    passwordBusy.value = false
  }
}

// --- Sign out -------------------------------------------------------------
const signOutBusy = ref(false)

async function signOut() {
  if (signOutBusy.value) return
  signOutBusy.value = true
  try {
    await $fetch(LOGOUT_URL, { method: 'POST' })
  } finally {
    user.value = null
    await navigateTo('/login')
  }
}

// --- Delete account ---------------------------------------------------
const confirmingDelete = ref(false)
const deletePassword = ref('')
const deleteFormError = ref('')
const deletePasswordError = ref('')
const deleteBusy = ref(false)
const deletePasswordField = ref<{ focus: () => void } | null>(null)
const deleteAlertEl = ref<HTMLElement | null>(null)

function openDeleteConfirm() {
  confirmingDelete.value = true
  deletePassword.value = ''
  deleteFormError.value = ''
  deletePasswordError.value = ''
}

function cancelDeleteConfirm() {
  confirmingDelete.value = false
}

async function deleteAccount() {
  if (deleteBusy.value) return
  deleteFormError.value = ''
  deletePasswordError.value = ''
  deleteBusy.value = true
  try {
    await $fetch(ACCOUNT_URL, { method: 'DELETE', body: { password: deletePassword.value } })
    user.value = null
    await navigateTo('/login?deleted=1')
  } catch (e: unknown) {
    const code = serverMessage(e)
    const data = serverErrorData(e)

    if (code === 'wrong_password') {
      deletePasswordError.value = t('auth.errors.wrong_password')
    } else if (code === 'rate_limited') {
      const seconds = Number(data.retryAfter ?? 0)
      deleteFormError.value = t('auth.errors.rate_limited', { minutes: Math.max(1, Math.ceil(seconds / 60)) })
    } else {
      deleteFormError.value = t('auth.errors.generic')
    }

    await nextTick()
    if (deletePasswordError.value) deletePasswordField.value?.focus()
    else deleteAlertEl.value?.focus()
  } finally {
    deleteBusy.value = false
  }
}
</script>

<template>
  <div class="you">
    <h1 class="vf-display you__title">{{ t('auth.you.title') }}</h1>

    <!-- Profile ---------------------------------------------------------->
    <UiCard>
      <p class="vf-muted you__email">{{ user?.email }}</p>
      <form class="you__name-form" novalidate @submit.prevent="saveName">
        <UiField
          ref="nameField"
          v-model="name"
          :label="t('auth.you.nameLabel')"
          :hint="!nameError ? t('auth.you.nameHint') : undefined"
          :error="nameError || null"
          autocomplete="name"
          :maxlength="40"
        />
        <div class="you__name-actions">
          <UiButton type="submit" variant="secondary" :loading="nameBusy">{{ t('auth.you.nameSave') }}</UiButton>
          <span v-if="nameSaved" class="you__saved vf-muted" role="status">{{ t('auth.you.nameSaved') }}</span>
        </div>
      </form>
    </UiCard>

    <!-- Appearance -------------------------------------------------------->
    <UiCard>
      <p class="vf-label you__section-label">{{ t('auth.you.appearance') }}</p>
      <UiThemeSwitch />
    </UiCard>

    <!-- Change password ---------------------------------------------------->
    <UiCard>
      <p class="vf-label you__section-label">{{ t('auth.you.changePasswordTitle') }}</p>
      <form class="auth-form" novalidate @submit.prevent="changePassword">
        <p
          v-if="passwordFormError"
          ref="passwordAlertEl"
          class="you__alert you__alert--error"
          role="alert"
          tabindex="-1"
        >{{ passwordFormError }}</p>
        <p v-if="passwordSaved" class="you__alert you__alert--notice" role="status">{{ t('auth.you.changePasswordSuccess') }}</p>

        <UiField
          ref="currentPasswordField"
          v-model="currentPassword"
          :label="t('auth.fields.currentPassword')"
          type="password"
          autocomplete="current-password"
          required
          :error="currentPasswordError || null"
        />
        <div>
          <UiField
            ref="newPasswordField"
            v-model="newPassword"
            :label="t('auth.fields.newPassword')"
            type="password"
            autocomplete="new-password"
            required
            :error="newPasswordError || null"
          />
          <AuthPasswordChecklist class="you__checklist" :password="newPassword" />
        </div>

        <UiButton type="submit" variant="secondary" :loading="passwordBusy" :disabled="!newPasswordValid">
          {{ t('auth.you.changePasswordSubmit') }}
        </UiButton>
      </form>
    </UiCard>

    <!-- Sign out ---------------------------------------------------------->
    <UiButton variant="secondary" full-width :loading="signOutBusy" @click="signOut">
      {{ t('auth.you.signOut') }}
    </UiButton>

    <!-- Danger zone --------------------------------------------------------->
    <UiCard class="you__danger">
      <p class="vf-label you__section-label">{{ t('auth.you.dangerZoneTitle') }}</p>

      <template v-if="!confirmingDelete">
        <p class="vf-muted you__danger-body">{{ t('auth.you.dangerZoneBody') }}</p>
        <UiButton variant="danger" full-width @click="openDeleteConfirm">{{ t('auth.you.deleteAccount') }}</UiButton>
      </template>

      <form v-else class="auth-form" novalidate @submit.prevent="deleteAccount">
        <p class="you__danger-confirm-title">{{ t('auth.you.deleteConfirmTitle') }}</p>
        <p class="vf-muted you__danger-body">{{ t('auth.you.deleteConfirmBody') }}</p>

        <p
          v-if="deleteFormError"
          ref="deleteAlertEl"
          class="you__alert you__alert--error"
          role="alert"
          tabindex="-1"
        >{{ deleteFormError }}</p>

        <UiField
          ref="deletePasswordField"
          v-model="deletePassword"
          :label="t('auth.fields.password')"
          type="password"
          autocomplete="current-password"
          required
          :error="deletePasswordError || null"
        />

        <div class="you__danger-actions">
          <UiButton type="button" variant="ghost" :disabled="deleteBusy" @click="cancelDeleteConfirm">
            {{ t('auth.you.deleteCancel') }}
          </UiButton>
          <UiButton type="submit" variant="danger" :loading="deleteBusy">
            {{ t('auth.you.deleteConfirmSubmit') }}
          </UiButton>
        </div>
      </form>
    </UiCard>
  </div>
</template>

<style scoped>
.you {
  display: flex;
  flex-direction: column;
  gap: var(--vf-space-4);
  max-width: var(--vf-width-page);
  margin: 0 auto;
  padding: var(--vf-space-6) var(--vf-space-4) var(--vf-space-16);
}

.you__title {
  font-size: var(--vf-text-display);
  margin-bottom: var(--vf-space-2);
}

.you__email {
  margin: 0 0 var(--vf-space-4);
  font-size: var(--vf-text-sm);
  word-break: break-all;
}

.you__name-form,
.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--vf-space-4);
}

.you__name-actions {
  display: flex;
  align-items: center;
  gap: var(--vf-space-3);
}

.you__saved {
  font-size: var(--vf-text-sm);
}

.you__section-label {
  margin-bottom: var(--vf-space-3);
}

.you__checklist {
  margin-top: var(--vf-space-2);
}

.you__alert {
  margin: 0;
  padding: var(--vf-space-3);
  border-radius: var(--vf-radius);
  font-size: var(--vf-text-sm);
}

.you__alert--error {
  border: var(--vf-border) solid var(--vf-color-hard);
  background: var(--vf-color-surface);
  color: var(--vf-color-hard);
  font-weight: var(--vf-weight-semibold);
}

.you__alert--notice {
  background: var(--vf-color-chip-bg);
  color: var(--vf-color-text);
}

.you__danger {
  border-color: var(--vf-color-hard);
}

.you__danger-body {
  margin: 0 0 var(--vf-space-4);
  font-size: var(--vf-text-sm);
}

.you__danger-confirm-title {
  margin: 0;
  font-weight: var(--vf-weight-semibold);
}

.you__danger-actions {
  display: flex;
  gap: var(--vf-space-3);
}

.you__danger-actions > * {
  flex: 1;
}
</style>
