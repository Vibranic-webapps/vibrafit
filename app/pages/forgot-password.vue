<script setup lang="ts">
/**
 * Request a password reset. The server always answers 200 {ok:true} for a
 * valid email, known or not — revealing which addresses have accounts would
 * be an enumeration leak — so success always shows the same neutral message.
 * Rate limiting and malformed input are the only ways this still surfaces
 * an actual error.
 */
definePageMeta({ layout: false })

const { t } = useI18n()

// A plain `string` (not a path literal) keeps TS from walking Nitro's typed
// route map — with this many /api/auth/* routes that literal-matching blows
// TS's recursion limit ("excessive stack depth").
const FORGOT_PASSWORD_URL: string = '/api/auth/forgot-password'

const email = ref('')
const formError = ref('')
const emailError = ref('')
const busy = ref(false)
const sent = ref(false)

const emailField = ref<{ focus: () => void } | null>(null)
const alertEl = ref<HTMLElement | null>(null)

async function submit() {
  if (busy.value) return
  formError.value = ''
  emailError.value = ''
  busy.value = true
  try {
    await $fetch(FORGOT_PASSWORD_URL, { method: 'POST', body: { email: email.value } })
    sent.value = true
  } catch (e: unknown) {
    const code = serverMessage(e)
    const data = serverErrorData(e)

    if (code === 'invalid_email') {
      emailError.value = t('auth.errors.invalid_email')
    } else if (code === 'rate_limited') {
      const seconds = Number(data.retryAfter ?? 0)
      formError.value = t('auth.errors.rate_limited', { minutes: Math.max(1, Math.ceil(seconds / 60)) })
    } else if (code === 'invalid_input') {
      formError.value = t('auth.errors.invalid_input')
    } else {
      formError.value = t('auth.errors.generic')
    }

    await nextTick()
    if (emailError.value) emailField.value?.focus()
    else alertEl.value?.focus()
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <AuthShell
    :title="sent ? t('auth.forgotPassword.sentTitle') : t('auth.forgotPassword.title')"
    :subtitle="sent ? undefined : t('auth.forgotPassword.subtitle')"
  >
    <form v-if="!sent" class="auth-form" novalidate @submit.prevent="submit">
      <p v-if="formError" ref="alertEl" class="auth-alert auth-alert--error" role="alert" tabindex="-1">{{ formError }}</p>

      <UiField
        ref="emailField"
        v-model="email"
        :label="t('auth.fields.email')"
        type="email"
        autocomplete="email"
        required
        :error="emailError || null"
      />

      <UiButton type="submit" variant="primary" full-width :loading="busy">
        {{ t('auth.forgotPassword.submit') }}
      </UiButton>
    </form>

    <p v-else class="auth-alert auth-alert--notice" role="status">{{ t('auth.forgotPassword.sentBody') }}</p>

    <template #footer>
      <p class="auth-footer-text">
        <NuxtLink to="/login" class="auth-link">{{ t('auth.forgotPassword.backToLogin') }}</NuxtLink>
      </p>
    </template>
  </AuthShell>
</template>
