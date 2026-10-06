<script setup lang="ts">
/**
 * Sign in. The server deliberately doesn't say whether the email or the
 * password was wrong (no account-enumeration oracle), so this screen shows
 * one ambiguous message for both and never guesses which field to blame.
 */
import type { AuthUser } from '~/composables/useAuthUser'

definePageMeta({ layout: false })

const { t } = useI18n()
const route = useRoute()
const user = useAuthUser()

// A plain `string` (not a path literal) keeps TS from walking Nitro's typed
// route map for every $fetch call below — with this many /api/auth/* routes
// that literal-matching blows TS's recursion limit ("excessive stack depth").
const LOGIN_URL: string = '/api/auth/login'

const email = ref('')
const password = ref('')
const remember = ref(true)
const formError = ref('')
const busy = ref(false)

const alertEl = ref<HTMLElement | null>(null)

// A deleted account lands back here with a neutral confirmation, not an error.
const justDeleted = computed(() => route.query.deleted === '1')

async function submit() {
  if (busy.value) return
  formError.value = ''
  busy.value = true
  try {
    user.value = await $fetch<AuthUser>(LOGIN_URL, {
      method: 'POST',
      body: { email: email.value, password: password.value, remember: remember.value },
    })
    await navigateTo('/')
  } catch (e: unknown) {
    const code = serverMessage(e)
    if (code === 'rate_limited') {
      const seconds = Number(serverErrorData(e).retryAfter ?? 0)
      formError.value = t('auth.errors.rate_limited', { minutes: Math.max(1, Math.ceil(seconds / 60)) })
    } else if (code === 'invalid_credentials') {
      formError.value = t('auth.errors.invalid_credentials')
    } else if (code === 'invalid_input') {
      formError.value = t('auth.errors.invalid_input')
    } else {
      formError.value = t('auth.errors.generic')
    }
    await nextTick()
    // No single field is to blame here, so focus moves to the alert itself.
    alertEl.value?.focus()
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <AuthShell :title="t('auth.login.title')" :subtitle="t('auth.login.subtitle')">
    <form class="auth-form" novalidate @submit.prevent="submit">
      <p v-if="justDeleted && !formError" class="auth-alert auth-alert--notice">{{ t('auth.login.deletedNotice') }}</p>
      <p v-if="formError" ref="alertEl" class="auth-alert auth-alert--error" role="alert" tabindex="-1">{{ formError }}</p>

      <UiField
        v-model="email"
        :label="t('auth.fields.email')"
        type="email"
        autocomplete="email"
        required
      />
      <UiField
        v-model="password"
        :label="t('auth.fields.password')"
        type="password"
        autocomplete="current-password"
        required
      />

      <label class="auth-remember">
        <input v-model="remember" type="checkbox">
        {{ t('auth.login.remember') }}
      </label>

      <UiButton type="submit" variant="primary" full-width :loading="busy">
        {{ t('auth.login.submit') }}
      </UiButton>
    </form>

    <template #footer>
      <p class="auth-footer-text">
        <NuxtLink to="/forgot-password" class="auth-link">{{ t('auth.login.forgotLink') }}</NuxtLink>
      </p>
      <p class="auth-footer-text">
        {{ t('auth.login.signupPrompt') }}
        <NuxtLink to="/signup" class="auth-link">{{ t('auth.login.signupLink') }}</NuxtLink>
      </p>
    </template>
  </AuthShell>
</template>

<style scoped>
.auth-remember {
  display: flex;
  align-items: center;
  gap: var(--vf-space-2);
  min-height: var(--vf-tap-min);
  font-size: var(--vf-text-sm);
  cursor: pointer;
}
</style>
