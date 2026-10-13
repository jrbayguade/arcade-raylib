<script lang="ts">
  import { getLanguage, t } from '../i18n/i18n';
  import { LANGUAGE_KEY, LANGUAGES } from '../i18n/language';

  /** CA · ES · EN: the choice is remembered and the page reloads in that language. */
  const current = getLanguage();
  function pick(lang: string): void {
    if (lang === current) return;
    try { localStorage.setItem(LANGUAGE_KEY, lang); } catch { /* private mode: it lasts this visit only */ }
    location.reload();
  }
</script>

<div class="lang-picker" role="group" aria-label={t('languageLabel')}>
  {#each LANGUAGES as lang (lang)}
    <button class:on={lang === current} aria-pressed={lang === current} data-sound="page"
      onclick={(e) => { e.stopPropagation(); pick(lang); }}>{lang.toUpperCase()}</button>
  {/each}
</div>
