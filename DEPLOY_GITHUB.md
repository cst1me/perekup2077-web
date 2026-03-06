# GitHub deploy — stable update system

## 1. Что загрузить в репозиторий
Загрузи в корень репозитория все файлы этой папки.

Важно, чтобы в корне были:
- `index.html`
- `styles.css`
- `sw.js`
- `manifest.json`
- `version.json`
- `patches/patches.json`
- `js/`
- `assets/`
- `.nojekyll`

## 2. Что отредактировать перед релизом
Открой `version.json` и поменяй:
- `version`
- `build`
- `versionName`
- `apk_url` — прямая ссылка на APK или Release

Для веб-версии `web_url` можно оставить `./`.

## 3. Как работает теперь
- если GitHub доступен, игра берёт свежие `version.json` и `patches.json`
- если GitHub временно недоступен, игра использует локальный кеш и продолжает работать
- экран обновлений показывает не «нет связи», а локальный режим
- Service Worker использует network-first для конфигов и stale-while-revalidate для статики

## 4. GitHub Pages
Включи Pages через Actions или Deploy from branch.
Если используешь этот репозиторий как project page, структура `./version.json` и `./patches/patches.json` уже будет работать.

## 5. APK
Рекомендуется загружать APK в GitHub Releases и вставлять ссылку в `apk_url`.


## Stable-max notes
- `version.json` and `patches/patches.json` are fetched with network-first and timeout fallback.
- If GitHub Pages is temporarily unavailable, the game stays in local mode instead of showing a hard failure.
- `offline.html` is used as the navigation fallback for PWA/WebView.
