<script setup lang="ts">
/**
 * Create an account. Open signup (Kilian's decision): no invite codes. The
 * password checklist mirrors the exact rules the server enforces
 * (shared/utils/password.ts), so it can't promise something the API refuses.
 */
import { passwordProblems } from '~~/shared/utils/password'
import type { AuthUser } from '~/composables/useAuthUser'

definePageMeta({ layout: false })

const { t } = useI18n()
const user = useAuthUser()

// A plain `string` (not a path literal) keeps TS from walking Nitro's typed
// route map — with this many /api/auth/* routes that literal-matching blows
// TS's recursion limit ("excessive stack depth").
const SIGNUP_URL: string = '/api/auth/signup'

const name = ref('')
const email = ref('')
const password = ref('')

const formError = ref('')
const nameError = ref('')
const emailError = ref('')
const passwordError = ref('')
const busy = ref(false)

const nameField = ref<{ focus: () => void } | null>(null)
const emailField = ref<{ focus: () => void } | null>(null)
const passwordField = ref<{ focus: () => void } | null>(null)
const alertEl = ref<HTMLElement | null>(null)

const passwordValid = computed(() => passwordProblems(password.value).length === 0)

function clearErrors() {
  formError.value = ''
  nameError.value = ''
  emailError.value = ''
  passwordError.value = ''
}

async function submit() {
  if (busy.value) return
  clearErrors()
  busy.value = true
  try {
    user.value = await $fetch<AuthUser>(SIGNUP_URL, {
      method: 'POST',
      body: { name: name.value, email: email.value, password: password.value },
    })
    await navigateTo('/')
  } catch (e: unknown) {
    const code = serverMessage(e)
    const data = serverErrorData(e)

    if (code === 'email_taken') {
      emailError.value = t('auth.errors.email_taken')
    } else if (code === 'invalid_email') {
      emailError.value = t('auth.errors.invalid_email')
    } else if (code === 'name_too_long') {
      nameError.value = t('auth.errors.name_too_long', { max: data.max })
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
    if (nameError.value) nameField.value?.focus()
    else if (emailError.value) emailField.value?.focus()
    else if (passwordError.value) passwordField.value?.focus()
    else alertEl.value?.focus()
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <AuthShell :title="t('auth.signup.title')" :subtitle="t('auth.signup.subtitle')">
    <form class="auth-form" novalidate @submit.prevent="submit">
      <p v-if="formError" ref="alertEl" class="auth-alert auth-alert--error" role="alert" tabindex="-1">{{ formError }}</p>

      <UiField
        ref="nameField"
        v-model="name"
        :label="t('auth.signup.nameOptional')"
        autocomplete="name"
        :maxlength="40"
        :error="nameError || null"
      />
      <UiField
        ref="emailField"
        v-model="email"
        :label="t('auth.fields.email')"
        type="email"
        autocomplete="email"
        required
        :error="emailError || null"
      />
      <div>
        <UiField
          ref="passwordField"
          v-model="password"
          :label="t('auth.fields.password')"
          type="password"
          autocomplete="new-password"
          required
          :error="passwordError || null"
        />
        <AuthPasswordChecklist class="auth-password-checklist" :password="password" />
      </div>

      <p class="auth-safety-note vf-muted">{{ t('auth.signup.safetyNote') }}</p>

      <UiButton type="submit" variant="primary" full-width :loading="busy" :disabled="!passwordValid">
        {{ t('auth.signup.submit') }}
      </UiButton>
    </form>

    <template #footer>
      <p class="auth-footer-text">
        {{ t('auth.signup.loginPrompt') }}
        <NuxtLink to="/login" class="auth-link">{{ t('auth.signup.loginLink') }}</NuxtLink>
      </p>
    </template>
  </AuthShell>
</template>

<style scoped>
.auth-password-checklist {
  margin-top: var(--vf-space-2);
}

.auth-safety-note {
  font-size: var(--vf-text-sm);
}
</style>
