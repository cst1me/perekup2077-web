// PEREKUP 2077 — Steam-like update system (manifest + SW) — железобетонный UI
import { toast } from '../core/utils.js';
import { APP_VERSION } from '../core/state.js';
import { openModal, closeModal } from '../ui/modal.js';
import { show } from '../ui/screens.js';

const MANIFEST_URL = './manifest.json';
const LS_BUILD_KEY = 'app_build';
const LS_VER_KEY   = 'app_version';
const LS_NOTES_KEY = 'app_notes';

let manifestCache = null;

function escapeHtml(s){
  return String(s)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'","&#039;");
}

async function fetchManifest(){
  const res = await fetch(`${MANIFEST_URL}?t=${Date.now()}`, { cache: 'no-store' });
  if(!res.ok) throw new Error('manifest fetch failed: ' + res.status);
  return await res.json();
}

function setPatchStatus(text, type=''){
  const el = document.getElementById('pn-status');
  if(!el) return;
  el.textContent = text;
  el.style.color =
    type==='ok' ? 'rgba(0,255,136,0.9)' :
    type==='warn' ? 'rgba(255,215,0,0.9)' :
    type==='err' ? 'rgba(255,45,45,0.9)' :
    'rgba(255,255,255,0.75)';
}

function ensureUpdateFab(){
  let fab = document.getElementById('update-fab');
  if(fab) return fab;

  fab = document.createElement('button');
  fab.id = 'update-fab';
  fab.type = 'button';
  fab.textContent = '⬆ Обновить';
  fab.style.cssText = [
    'position:fixed',
    'right:12px',
    'bottom:12px',
    'z-index:9999',
    'display:none',
    'padding:10px 12px',
    'border-radius:14px',
    'border:1px solid rgba(255,0,255,0.45)',
    'background:rgba(20,10,30,0.85)',
    'color:#fff',
    'backdrop-filter:blur(8px)',
    'box-shadow:0 10px 30px rgba(0,0,0,0.35)',
    'font-family:inherit',
    'cursor:pointer'
  ].join(';');
  fab.addEventListener('click', ()=>{
    showPatchNotes();
    // пользователь сам нажмёт "Обновить" (с подтверждением)
  });

  document.body.appendChild(fab);
  return fab;
}

function showUpdateUI(show){
  const fab = ensureUpdateFab();
  fab.style.display = show ? 'inline-block' : 'none';

  const btn = document.getElementById('pn-update-btn');
  if(btn) btn.style.display = show ? 'inline-block' : 'none';
}

export async function swReady(){
  if(!('serviceWorker' in navigator)) return null;
  try{
    const reg = await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' });
    await navigator.serviceWorker.ready;
    return reg;
  }catch(e){
    return null;
  }
}

function renderPatchNotesFromLocal(){
  try{
    const b = localStorage.getItem(LS_BUILD_KEY) || '';
    const v = localStorage.getItem(LS_VER_KEY) || APP_VERSION;
    const notes = JSON.parse(localStorage.getItem(LS_NOTES_KEY) || '[]');

    const pnBuild = document.getElementById('pn-build');
    const pnVer = document.getElementById('pn-ver');
    const pnNotes = document.getElementById('pn-notes');

    if(pnBuild) pnBuild.textContent = b ? b : '—';
    if(pnVer) pnVer.textContent = v ? v : '—';

    if(pnNotes){
      if(notes && notes.length){
        pnNotes.innerHTML = notes.map(n=>`<div class="changelog-item">• ${escapeHtml(n)}</div>`).join('');
      } else {
        pnNotes.innerHTML = `<div class="changelog-item">• Пока нет заметок</div>`;
      }
    }
  }catch(e){}
}

export function openUpdateMenu(){ showPatchNotes(); }
export function openIntegrityMenu(){ showPatchNotes(); setTimeout(()=>verifyIntegrity(), 250); }

export function showPatchNotes(){
  show('patch-screen');
  renderPatchNotesFromLocal();
  checkForUpdate(false);
}

export async function checkForUpdate(showToasts){
  try{
    setPatchStatus('Проверяю обновление…');
    manifestCache = await fetchManifest();

    // отрисуем patch notes прямо из манифеста (самый честный источник)
    const pnTitle = document.getElementById('pn-title');
    const pnNotes = document.getElementById('pn-notes');
    const pnBuild = document.getElementById('pn-build');
    const pnVer = document.getElementById('pn-ver');

    if(pnTitle) pnTitle.textContent = manifestCache.title || 'Обновления';
    if(pnBuild) pnBuild.textContent = String(manifestCache.build ?? '—');
    if(pnVer) pnVer.textContent = String(manifestCache.version ?? APP_VERSION);

    if(pnNotes){
      const notes = manifestCache.notes || [];
      pnNotes.innerHTML = (notes.length ? notes : ['Пока нет заметок'])
        .map(n=>`<div class="changelog-item">• ${escapeHtml(n)}</div>`).join('');
    }

    const installedBuild = parseInt(localStorage.getItem(LS_BUILD_KEY) || '0', 10) || 0;
    const newBuild = parseInt(String(manifestCache.build || 0), 10) || 0;

    if(newBuild > installedBuild){
      showUpdateUI(true);
      setPatchStatus(`Доступно обновление: build ${newBuild} (у тебя ${installedBuild || 'нет'}).`, 'warn');
      if(showToasts) toast('🔄 Доступно обновление!', 'success');
    } else {
      showUpdateUI(false);
      setPatchStatus(`У тебя актуальная версия (build ${installedBuild || newBuild}).`, 'ok');
      if(showToasts) toast('✅ Версия актуальна', 'success');
    }

    // сохраняем notes/version для оффлайна (build — только после успешного CACHE_BUILD)
    localStorage.setItem(LS_NOTES_KEY, JSON.stringify(manifestCache.notes || []));
    localStorage.setItem(LS_VER_KEY, String(manifestCache.version || APP_VERSION));
  }catch(e){
    showUpdateUI(false);
    setPatchStatus('Не удалось проверить обновление (нет сети?).', 'err');
    if(showToasts) toast('⚠️ Не удалось проверить обновление', 'error');
  }
}

async function ensureControllerReady(){
  // Если воркер зарегистрирован, но controller ещё нет (первый запуск) —
  // просим пользователя перезагрузить страницу (без “ложных обновился”).
  if(navigator.serviceWorker.controller) return true;

  const needReload = await new Promise((resolve)=>{
    openModal('Обновления', `
      <div class="muted">Чтобы включить авто‑обновления, нужен Service Worker контроллер.</div>
      <div style="height:10px"></div>
      <div>Нажми <b>Перезагрузить</b>, затем повтори обновление.</div>
      <div style="height:12px"></div>
      <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">
        <button class="btn" id="upd-cancel">Отмена</button>
        <button class="btn primary" id="upd-reload">Перезагрузить</button>
      </div>
    `);
    const c = document.getElementById('upd-cancel');
    const r = document.getElementById('upd-reload');
    if(c) c.onclick = ()=>{ closeModal(); resolve(false); };
    if(r) r.onclick = ()=>{ closeModal(); resolve(true); };
  });

  if(needReload){
    location.reload();
    return false;
  }
  return false;
}

async function confirmUpdate(newBuild){
  return await new Promise((resolve)=>{
    openModal('Доступно обновление', `
      <div>Найден новый build: <b>${escapeHtml(newBuild)}</b>.</div>
      <div class="muted" style="margin-top:8px">Скачать и применить обновление сейчас?</div>
      <div style="height:12px"></div>
      <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">
        <button class="btn" id="upd-no">Не сейчас</button>
        <button class="btn primary" id="upd-yes">Обновить</button>
      </div>
    `);
    const no = document.getElementById('upd-no');
    const yes = document.getElementById('upd-yes');
    if(no) no.onclick = ()=>{ closeModal(); resolve(false); };
    if(yes) yes.onclick = ()=>{ closeModal(); resolve(true); };
  });
}

export async function applyUpdate(){
  try{
    const reg = await swReady();
    if(!reg) throw new Error('SW registration failed');

    if(!manifestCache) manifestCache = await fetchManifest();

    const installedBuild = parseInt(localStorage.getItem(LS_BUILD_KEY) || '0', 10) || 0;
    const newBuild = parseInt(String(manifestCache.build || 0), 10) || 0;

    if(!(newBuild > installedBuild)){
      toast('✅ Уже актуально', 'success');
      showUpdateUI(false);
      return;
    }

    const okConfirm = await confirmUpdate(newBuild);
    if(!okConfirm) return;

    // Controller must exist to message it
    const controllerOk = await ensureControllerReady();
    if(!controllerOk) return;

    const btn = document.getElementById('pn-update-btn');
    if(btn){ btn.disabled = true; btn.textContent = '⬇️ Скачиваю…'; }

    setPatchStatus('Скачиваю файлы обновления…', 'warn');

    const result = await new Promise((resolve) => {
      const ch = new MessageChannel();
      ch.port1.onmessage = (ev)=> resolve(ev.data || {});
      navigator.serviceWorker.controller.postMessage(
        { type:'CACHE_BUILD', build: manifestCache.build, files: manifestCache.files },
        [ch.port2]
      );
    });

    if(!result.ok){
      throw new Error(result.error || 'cache failed');
    }

    // только здесь фиксируем build
    localStorage.setItem(LS_BUILD_KEY, String(manifestCache.build || 0));
    localStorage.setItem(LS_VER_KEY, String(manifestCache.version || APP_VERSION));
    localStorage.setItem(LS_NOTES_KEY, JSON.stringify(manifestCache.notes || []));

    setPatchStatus('Обновление установлено. Перезагружаю…', 'ok');
    toast('🚀 Обновление установлено!', 'success');

    // reload только после ok:true
    setTimeout(()=>location.reload(), 250);
  }catch(e){
    const btn = document.getElementById('pn-update-btn');
    if(btn){ btn.disabled = false; btn.textContent = '⬆ Обновить'; }
    setPatchStatus('Ошибка обновления: ' + String(e?.message || e), 'err');
    toast('❌ Ошибка обновления', 'error');
  }
}

// Заглушка проверки целостности (можно расширить)
export async function verifyIntegrity(){
  try{
    setPatchStatus('Проверяю целостность…');
    const reg = await swReady();
    if(!reg) throw new Error('SW not available');
    if(!manifestCache) manifestCache = await fetchManifest();
    setPatchStatus('OK. Если есть проблемы — нажми "Обновить".', 'ok');
  }catch(e){
    setPatchStatus('Integrity check failed.', 'err');
  }
}

export async function initSteamUpdate(){
  ensureUpdateFab();
  await swReady();

  // Подтягиваем manifest для notes/version; build НЕ выставляем автоматически.
  try{
    manifestCache = await fetchManifest();
    localStorage.setItem(LS_VER_KEY, String(manifestCache.version || APP_VERSION));
    localStorage.setItem(LS_NOTES_KEY, JSON.stringify(manifestCache.notes || []));
  }catch(_e){}

  // Ненавязчивая проверка обновления на старте
  setTimeout(()=>checkForUpdate(false), 3500);
}


// ──────────────────────────────────────────────
//  "ПОЧИНИТЬ ИГРУ" — сброс кеша/Service Worker
//  НЕ трогаем игровой прогресс (localStorage keys игры не удаляем)
// ──────────────────────────────────────────────
export async function resetAppCachesAndReload(){
  try{
    // Попросим активный SW удалить кеши
    if(navigator.serviceWorker && navigator.serviceWorker.controller){
      const ok = await new Promise((resolve)=>{
        const ch = new MessageChannel();
        ch.port1.onmessage = (e)=>resolve(!!(e.data && e.data.ok));
        navigator.serviceWorker.controller.postMessage({ type:'RESET_CACHES' }, [ch.port2]);
        setTimeout(()=>resolve(false), 2500);
      });
    }

    // Дублирующая страховка: очистить CacheStorage (на случай если SW не активен)
    if(window.caches){
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }

    // Разрегистрировать SW (чтобы старт был "с нуля")
    if(navigator.serviceWorker && navigator.serviceWorker.getRegistrations){
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }

    // очистить только ключи апдейтера (не прогресс)
    try{
      localStorage.removeItem(LS_BUILD_KEY);
    }catch(_e){}
  }catch(e){
    console.warn(e);
  }

  location.href = './?fix=' + Date.now();
}
