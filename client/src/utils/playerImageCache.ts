import { type PlayerPose, getPlayerSvg } from './playerSvg';

const cache = new Map<string, HTMLImageElement>();
const loading = new Set<string>();

function cacheKey(pose: PlayerPose, color: string): string {
  return `${pose}:${color}`;
}

export function getPlayerImage(pose: PlayerPose, color: string): HTMLImageElement | null {
  const key = cacheKey(pose, color);
  const cached = cache.get(key);
  if (cached) return cached;

  if (!loading.has(key)) {
    loading.add(key);
    const svgStr = getPlayerSvg(pose, color);
    const url = 'data:image/svg+xml,' + encodeURIComponent(svgStr);
    const img = new Image();
    img.onload = () => {
      cache.set(key, img);
      loading.delete(key);
    };
    img.onerror = () => {
      loading.delete(key);
    };
    img.src = url;
  }

  return null;
}

const ALL_POSES: PlayerPose[] = ['stand', 'run', 'pass', 'goalkeeper', 'trainer'];

export function preloadPlayerImages(colors: string[]): Promise<void> {
  const promises: Promise<void>[] = [];

  for (const pose of ALL_POSES) {
    for (const color of colors) {
      const key = cacheKey(pose, color);
      if (cache.has(key)) continue;

      promises.push(
        new Promise<void>((resolve) => {
          const svgStr = getPlayerSvg(pose, color);
          const url = 'data:image/svg+xml,' + encodeURIComponent(svgStr);
          const img = new Image();
          img.onload = () => {
            cache.set(key, img);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = url;
        })
      );
    }
  }

  return Promise.all(promises).then(() => {});
}
