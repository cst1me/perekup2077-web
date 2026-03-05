// PEREKUP 2077 — modal helpers
export function openModal(title, html) {
  const m = document.getElementById('modal');
  if (!m) return;
  document.getElementById('modal-title').textContent = title || '';
  const body = document.getElementById('modal-body');
  body.innerHTML = html || '';
  m.classList.add('active');
}
export function closeModal() {
  document.getElementById('modal')?.classList.remove('active');
}
