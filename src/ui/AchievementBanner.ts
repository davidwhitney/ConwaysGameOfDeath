const BANNER_SLIDE_MS = 400;
const BANNER_HOLD_MS = 3000;

export function showAchievementBanner(name: string, description: string): void {
  const banner = document.createElement('div');
  Object.assign(banner.style, {
    position: 'fixed',
    top: '0',
    left: '50%',
    transform: 'translateX(-50%) translateY(-100%)',
    zIndex: '9999',
    pointerEvents: 'none',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    padding: '12px 28px',
    background: 'rgba(17, 17, 51, 0.95)',
    border: '2px solid #ffcc00',
    borderTop: 'none',
    borderRadius: '0 0 8px 8px',
    fontFamily: 'monospace',
    textAlign: 'center',
    transition: `transform ${BANNER_SLIDE_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1)`,
  });

  const header = document.createElement('div');
  Object.assign(header.style, { fontSize: '11px', color: '#ffcc00', fontWeight: 'bold', letterSpacing: '1px' });
  header.textContent = 'ACHIEVEMENT UNLOCKED';

  const title = document.createElement('div');
  Object.assign(title.style, { fontSize: '17px', color: '#ffffff', fontWeight: 'bold' });
  title.textContent = name;

  const desc = document.createElement('div');
  Object.assign(desc.style, { fontSize: '11px', color: '#aaaacc' });
  desc.textContent = description;

  banner.append(header, title, desc);
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
