const BANNER_SLIDE_MS = 400;
const BANNER_HOLD_MS = 3000;

export function showAchievementBanner(name: string, description: string): void {
  const banner = document.createElement('div');
  banner.style.cssText = `
    position: fixed;
    top: 0;
    left: 50%;
    transform: translateX(-50%) translateY(-100%);
    z-index: 9999;
    pointer-events: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 12px 28px;
    background: rgba(17, 17, 51, 0.95);
    border: 2px solid #ffcc00;
    border-top: none;
    border-radius: 0 0 8px 8px;
    font-family: monospace;
    text-align: center;
    transition: transform ${BANNER_SLIDE_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1);
  `;

  banner.innerHTML = `
    <div style="font-size: 11px; color: #ffcc00; font-weight: bold; letter-spacing: 1px;">ACHIEVEMENT UNLOCKED</div>
    <div style="font-size: 17px; color: #ffffff; font-weight: bold;">${esc(name)}</div>
    <div style="font-size: 11px; color: #aaaacc;">${esc(description)}</div>
  `;

  document.body.appendChild(banner);

  // Slide in
  requestAnimationFrame(() => {
    banner.style.transform = 'translateX(-50%) translateY(0)';
  });

  // Hold, then slide out and remove
  setTimeout(() => {
    banner.style.transition = `transform ${BANNER_SLIDE_MS}ms ease-in`;
    banner.style.transform = 'translateX(-50%) translateY(-100%)';
    setTimeout(() => banner.remove(), BANNER_SLIDE_MS);
  }, BANNER_SLIDE_MS + BANNER_HOLD_MS);
}

function esc(s: string): string {
  const el = document.createElement('span');
  el.textContent = s;
  return el.innerHTML;
}
