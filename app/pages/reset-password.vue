<script setup lang="ts">
/**
 * Set a new password from a reset-link token (?token=). The endpoint signs
 * the user in on success but its response body is just {ok:true}, so this
 * page re-fetches /api/auth/me afterward to populate the shared auth state
 * (same pattern the auth.global middleware uses).
 */
import { passwordProblems } from '~~/shared/utils/password'
import type { AuthUser } from '~/composables/useAuthUser'

definePageMeta({ layout: false })

const { t } = useI18n()
const route = useRoute()
const user = useAuthUser()

// Plain `string`s (not path literals) keep TS from walking Nitro's typed
// route map — with this many /api/auth/* routes that literal-matching blows
// TS's recursion limit ("excessive stack depth").
const RESET_PASSWORD_URL: string = '/api/auth/reset-password'
const ME_URL: string = '/api/auth/me'

const token = computed(() => String(route.query.token ?? ''))

const password = ref('')
const formError = ref('')
const passwordError = ref('')
const busy = ref(false)
// A token can start present and still turn out invalid/expired on submit -
// both cases show the same "this link doesn't work" state.
const tokenInvalid = ref(false)

const passwordField = ref<{ focus: () => void } | null>(null)
const alertEl = ref<HTMLElement | null>(null)

const passwordValid = computed(() => passwordProblems(password.value).length === 0)
const showMissingState = computed(() => !token.value || tokenInvalid.value)

async function submit() {
  if (busy.value) return
  formError.value = ''
  passwordError.value = ''
  busy.value = true
  try {
    await $fetch(RESET_PASSWORD_URL, {
      method: 'POST',
      body: { token: token.value, password: password.value },
    })
    user.value = await $fetch<AuthUser>(ME_URL)
    await navigateTo('/')
  } catch (e: unknown) {
    const code = serverMessage(e)
    const data = serverErrorData(e)

    if (code === 'invalid_reset_token') {
      tokenInvalid.value = true
    } else if (code === 'weak_password') {
      passwordError.value = t('auth.errors.weak_password')
    } else if (code === 'password_too_long') {
      passwordError.value = t('auth.errors.password_too_long')
    } else if (code === 'rate_limited') {
      const seconds = Number(data.retryAfter ?? 0)
      formError.value = t('auth.errors.rate_limited', { minutes: Math.max(1, Math.ceil(seconds / 60)) })
    } else if (code === 'invalid_input') {
      formError.value = t('auth.errors.invalid_input')
    } else {
      formError.value = t('auth.errors.generic')
    }

    await nextTick()
    if (passwordError.value) passwordField.value?.focus()
    else alertEl.value?.focus()
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <AuthShell v-if="showMissingState" :title="t('auth.resetPassword.missingTitle')">
    <p class="vf-muted auth-missing-body">{{ t('auth.resetPassword.missingBody') }}</p>
    <UiButton variant="primary" full-width href="/forgot-password">
      {{ t('auth.resetPassword.requestNewLink') }}
    </UiButton>

    <template #footer>
      <p class="auth-footer-text">
        <NuxtLink to="/login" class="auth-link">{{ t('auth.resetPassword.backToLogin') }}</NuxtLink>
      </p>
    </template>
  </AuthShell>

  <AuthShell v-else :title="t('auth.resetPassword.title')" :subtitle="t('auth.resetPassword.subtitle')">
    <form class="auth-form" novalidate @submit.prevent="submit">
      <p v-if="formError" ref="alertEl" class="auth-alert auth-alert--error" role="alert" tabindex="-1">{{ formError }}</p>

      <div>
        <UiField
          ref="passwordField"
          v-model="password"
          :label="t('auth.fields.newPassword')"
          type="password"
          autocomplete="new-password"
          required
          :error="passwordError || null"
        />
        <AuthPasswordChecklist class="auth-password-checklist" :password="password" />
      </div>

      <UiButton type="submit" variant="primary" full-width :loading="busy" :disabled="!passwordValid">
        {{ t('auth.resetPassword.submit') }}
      </UiButton>
    </form>

    <template #footer>
      <p class="auth-footer-text">
        <NuxtLink to="/login" class="auth-link">{{ t('auth.resetPassword.backToLogin') }}</NuxtLink>
      </p>
    </template>
  </AuthShell>
</template>

<style scoped>
.auth-missing-body {
  margin: 0 0 var(--vf-space-4);
  font-size: var(--vf-text-sm);
}

.auth-password-checklist {
  margin-top: var(--vf-space-2);
}
</style>
