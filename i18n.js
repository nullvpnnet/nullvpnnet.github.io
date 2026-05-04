/**
 * NullVPN i18n — zero-dependency static language switcher
 * Supports: en, ru, fa (Farsi/RTL), ne (Nepali), zh (Simplified Chinese)
 */
(function () {
  const STORAGE_KEY = 'nullvpn_lang';
  const DEFAULT_LANG = 'en';
  const RTL_LANGS = ['fa'];

  const LANGS = {
    en: { label: 'EN', name: 'English', flag: '🇬🇧' },
    ru: { label: 'RU', name: 'Русский', flag: '🇷🇺' },
    fa: { label: 'FA', name: 'فارسی', flag: '🇮🇷' },
    ne: { label: 'NE', name: 'नेपाली', flag: '🇳🇵' },
    zh: { label: 'ZH', name: '中文', flag: '🇨🇳' },
  };