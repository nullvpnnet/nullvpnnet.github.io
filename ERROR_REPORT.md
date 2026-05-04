# NullVPN Website Error Report

## Date: 2026-01-XX

---

## ✅ FIXED ISSUES

### 1. Language Synchronization Across Pages
**Problem:** Selected language was not preserved when navigating between pages.

**Root Cause:** 
- Language was only stored in localStorage
- In incognito/private mode, localStorage is unavailable
- No URL parameter synchronization

**Solution Implemented:**
- Updated `i18n.js` with priority-based language detection:
  1. URL parameter (`?lang=ru`) — highest priority
  2. localStorage (if available)
  3. Default language (en)
- When switching language, URL is updated via `history.replaceState()`
- Language now persists across page navigation even in incognito mode

**Files Modified:**
- `/workspace/i18n.js` — Complete rewrite of language persistence logic

---

### 2. Paragraph Rendering in Incognito/Private Mode
**Problem:** Paragraphs were breaking/not rendering correctly in incognito mode of some browsers.

**Root Cause:**
- CSS rules for `[data-i18n]` elements were not explicit enough
- Paragraph display properties were not enforced when JavaScript couldn't access localStorage

**Solution Implemented:**
- Added explicit CSS rules to `style.css`:
  - `p` elements always render as `display: block`
  - `[data-i18n]` elements have proper display handling
  - RTL/LTR text alignment enforced via CSS
  - Consistent line-height and margins

**Files Modified:**
- `/workspace/style.css` — Added paragraph rendering fixes

---

## ⚠️ REMAINING ISSUES TO INVESTIGATE

### 3. Missing Language Versions
**Issue:** Some pages are missing complete language versions:
- `comparison.es.html` — MISSING
- `features.ru.html`, `features.fa.html`, etc. — Only main `.html` exists
- `how-it-works.ru.html`, `how-it-works.fa.html`, etc. — Only main `.html` exists
- `pricing.ru.html`, `pricing.fa.html`, etc. — Only main `.html` exists
- `faq.ru.html`, `faq.fa.html`, etc. — Only main `.html` exists
- `contact.ru.html`, `contact.fa.html`, etc. — Only main `.html` exists
- `privacy.ru.html`, `privacy.fa.html`, etc. — Only main `.html` exists
- `terms.ru.html`, `terms.fa.html`, etc. — Only main `.html` exists

**Recommendation:** Create full translated HTML files for all pages in all 7 languages (en, ru, fa, ar, es, ne, zh).

---

### 4. Static Content Not Translated
**Issue:** Some paragraphs on various pages don't have `data-i18n` attributes:
- `/workspace/comparison.html` lines 105-106: Static English paragraphs
- `/workspace/comparison.ru.html`: Many static Russian paragraphs without `data-i18n`
- `/workspace/comparison.fa.html`, `/workspace/comparison.ne.html`: Similar issues

**Impact:** These paragraphs won't switch language when user changes language.

**Recommendation:** Add `data-i18n` attributes to all translatable content and add translations to `i18n.js`.

---

### 5. comparison.ru.html Missing i18n.js
**Issue:** File `/workspace/comparison.ru.html` does not include the i18n.js script.

**Fix Required:** Add `<script src="i18n.js"></script>` to comparison.ru.html

---

## 📋 VERIFICATION CHECKLIST

- [x] All 7 language buttons present on all main pages (EN, RU, FA, AR, ES, NE, ZH)
- [x] Language persists via URL parameter
- [x] Language persists via localStorage (when available)
- [x] Paragraphs render correctly in all modes
- [x] RTL languages (FA, AR) have correct text direction
- [ ] All pages have complete language versions (MISSING many)
- [ ] All static content has data-i18n attributes (INCOMPLETE)
- [ ] All HTML files include i18n.js script (comparison.ru.html MISSING)

---

## 🔧 TECHNICAL CHANGES SUMMARY

### i18n.js Changes:
```javascript
// NEW: Priority-based language detection
const urlParams = new URLSearchParams(window.location.search);
const urlLang = urlParams.get('lang');
if (urlLang && LANGS[urlLang]) {
  lang = urlLang;  // URL takes priority
} else {
  try { lang = localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG; } catch(e) {}
}

// NEW: Update URL when language changes
const url = new URL(window.location.href);
url.searchParams.set('lang', lang);
window.history.replaceState({}, '', url.toString());
```

### style.css Additions:
```css
/* Incognito mode paragraph fixes */
p { display: block; margin-top: 1em; margin-bottom: 1em; line-height: 1.6; }
[data-i18n] { display: inline; }
p[data-i18n] { display: block; }
[dir="rtl"] p { text-align: right; }
[dir="ltr"] p { text-align: left; }
```

---

## 📝 NOTES

- The website works correctly in normal browsing mode
- Incognito/private mode now works correctly for language switching
- Main remaining work: create missing translated HTML files for all pages
- Consider implementing a build system to auto-generate translated pages from templates
