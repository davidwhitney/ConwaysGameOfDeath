/**
 * Restart the scene on browser resize (debounced) so the UI re-layouts
 * at the new dimensions. Pass the scene's init data so state is preserved.
 */
export function onResizeRestart(scene: Phaser.Scene, data?: object): void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const handler = () => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => scene.scene.restart(data), 200);
  };
  scene.scale.on('resize', handler);
  scene.events.once('shutdown', () => {
    scene.scale.off('resize', handler);
    if (timer !== null) clearTimeout(timer);
  });
}
