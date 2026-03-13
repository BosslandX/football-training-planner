export type PlayerPose = 'stand' | 'run' | 'pass' | 'goalkeeper' | 'trainer';

const SKIN = '#f0c8a0';
const SKIN_DARK = '#d4a574';
const HAIR = '#3d2b1f';
const SHORTS_WHITE = '#fff';
const SHORTS_STROKE = '#ddd';
const SOCKS = '#fff';
const BOOTS = '#222';
const TRAINER_JACKET = '#34495e';
const TRAINER_PANTS = '#2c3e50';

function svg(inner: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 80">${inner}</svg>`;
}

function head(cx: number, cy: number): string {
  return (
    `<circle cx="${cx}" cy="${cy}" r="7" fill="${SKIN}" stroke="${SKIN_DARK}" stroke-width="0.5"/>` +
    `<path d="M${cx - 6},${cy - 2} Q${cx - 3},${cy - 9} ${cx},${cy - 8} Q${cx + 3},${cy - 9} ${cx + 6},${cy - 2}" fill="${HAIR}"/>`
  );
}

function neck(): string {
  return `<rect x="28" y="18" width="4" height="3" rx="1" fill="${SKIN}"/>`;
}

function sock(x: number, y: number): string {
  return `<rect x="${x}" y="${y}" width="6" height="5" rx="1.5" fill="${SOCKS}"/>`;
}

function boot(cx: number, y: number, flip: boolean): string {
  if (flip) {
    return `<path d="M${cx + 3},${y} L${cx + 3},${y + 4} L${cx - 4},${y + 4} L${cx - 4},${y + 2} L${cx - 2},${y} Z" fill="${BOOTS}"/>`;
  }
  return `<path d="M${cx - 3},${y} L${cx - 3},${y + 4} L${cx + 4},${y + 4} L${cx + 4},${y + 2} L${cx + 2},${y} Z" fill="${BOOTS}"/>`;
}

function standSvg(shirt: string): string {
  return svg([
    // Legs
    `<path d="M25,53 L25,64" stroke="${SKIN}" stroke-width="5" stroke-linecap="round" fill="none"/>`,
    `<path d="M35,53 L35,64" stroke="${SKIN}" stroke-width="5" stroke-linecap="round" fill="none"/>`,
    // Socks
    sock(22, 63), sock(32, 63),
    // Boots
    boot(25, 68, false), boot(35, 68, true),
    // Shorts
    `<path d="M22,42 L38,42 L37,53 L31,51.5 L29,51.5 L23,53 Z" fill="${SHORTS_WHITE}" stroke="${SHORTS_STROKE}" stroke-width="0.5"/>`,
    // Torso
    `<path d="M19,22 C19,20 30,19 30,19 C30,19 41,20 41,22 L39,42 L21,42 Z" fill="${shirt}" stroke="rgba(0,0,0,0.12)" stroke-width="0.5"/>`,
    // Collar
    `<path d="M27,20 L30,23.5 L33,20" fill="none" stroke="rgba(0,0,0,0.2)" stroke-width="0.8"/>`,
    // Sleeve lines
    `<line x1="19" y1="22" x2="17" y2="27" stroke="rgba(0,0,0,0.1)" stroke-width="0.5"/>`,
    `<line x1="41" y1="22" x2="43" y2="27" stroke="rgba(0,0,0,0.1)" stroke-width="0.5"/>`,
    // Arms
    `<path d="M19,24 Q15,33 17,40" stroke="${SKIN}" stroke-width="3.5" stroke-linecap="round" fill="none"/>`,
    `<path d="M41,24 Q45,33 43,40" stroke="${SKIN}" stroke-width="3.5" stroke-linecap="round" fill="none"/>`,
    // Neck + Head
    neck(), head(30, 12),
  ].join(''));
}

function runSvg(shirt: string): string {
  return svg([
    // Back leg (left, extended back)
    `<path d="M27,52 L20,64" stroke="${SKIN}" stroke-width="5" stroke-linecap="round" fill="none"/>`,
    sock(17, 62), boot(20, 67, true),
    // Front leg (right, forward)
    `<path d="M33,52 L40,62" stroke="${SKIN}" stroke-width="5" stroke-linecap="round" fill="none"/>`,
    sock(37, 60), boot(40, 65, false),
    // Shorts (slightly angled for motion)
    `<path d="M23,42 L37,42 L38,52 L31,51 L29,51 L22,52 Z" fill="${SHORTS_WHITE}" stroke="${SHORTS_STROKE}" stroke-width="0.5"/>`,
    // Torso (slight forward lean)
    `<path d="M20,22 C20,20 30,19 30,19 C30,19 40,20 40,22 L38,42 L22,42 Z" fill="${shirt}" stroke="rgba(0,0,0,0.12)" stroke-width="0.5"/>`,
    // Collar
    `<path d="M27,20 L30,23.5 L33,20" fill="none" stroke="rgba(0,0,0,0.2)" stroke-width="0.8"/>`,
    // Back arm (right, behind/up)
    `<path d="M40,24 Q46,28 47,32" stroke="${SKIN}" stroke-width="3.5" stroke-linecap="round" fill="none"/>`,
    // Front arm (left, forward/down)
    `<path d="M20,24 Q14,30 12,36" stroke="${SKIN}" stroke-width="3.5" stroke-linecap="round" fill="none"/>`,
    // Neck + Head
    neck(), head(30, 12),
  ].join(''));
}

function passSvg(shirt: string): string {
  return svg([
    // Planted leg (left, slightly bent)
    `<path d="M26,52 L24,65" stroke="${SKIN}" stroke-width="5" stroke-linecap="round" fill="none"/>`,
    sock(21, 63), boot(24, 68, false),
    // Kicking leg (right, extended forward)
    `<path d="M34,52 Q40,56 44,60" stroke="${SKIN}" stroke-width="5" stroke-linecap="round" fill="none"/>`,
    sock(41, 58), boot(44, 63, false),
    // Shorts
    `<path d="M22,42 L38,42 L38,52 L31,51 L29,51 L22,52 Z" fill="${SHORTS_WHITE}" stroke="${SHORTS_STROKE}" stroke-width="0.5"/>`,
    // Torso (slight twist)
    `<path d="M20,22 C20,20 30,19 30,19 C30,19 40,20 40,22 L38,42 L22,42 Z" fill="${shirt}" stroke="rgba(0,0,0,0.12)" stroke-width="0.5"/>`,
    // Collar
    `<path d="M27,20 L30,23.5 L33,20" fill="none" stroke="rgba(0,0,0,0.2)" stroke-width="0.8"/>`,
    // Left arm (forward for balance)
    `<path d="M20,24 Q14,28 11,34" stroke="${SKIN}" stroke-width="3.5" stroke-linecap="round" fill="none"/>`,
    // Right arm (back for balance)
    `<path d="M40,24 Q46,30 47,36" stroke="${SKIN}" stroke-width="3.5" stroke-linecap="round" fill="none"/>`,
    // Neck + Head
    neck(), head(30, 12),
  ].join(''));
}

function goalkeeperSvg(shirt: string): string {
  return svg([
    // Wide legs (bent knees)
    `<path d="M26,52 Q22,58 20,66" stroke="${SKIN}" stroke-width="5" stroke-linecap="round" fill="none"/>`,
    `<path d="M34,52 Q38,58 40,66" stroke="${SKIN}" stroke-width="5" stroke-linecap="round" fill="none"/>`,
    // Socks
    sock(17, 64), sock(37, 64),
    // Boots
    boot(20, 69, true), boot(40, 69, false),
    // Shorts (GK long shorts)
    `<path d="M21,42 L39,42 L39,53 L31,52 L29,52 L21,53 Z" fill="${SHORTS_WHITE}" stroke="${SHORTS_STROKE}" stroke-width="0.5"/>`,
    // Torso (wider stance)
    `<path d="M18,22 C18,20 30,19 30,19 C30,19 42,20 42,22 L40,42 L20,42 Z" fill="${shirt}" stroke="rgba(0,0,0,0.12)" stroke-width="0.5"/>`,
    // Collar
    `<path d="M27,20 L30,23.5 L33,20" fill="none" stroke="rgba(0,0,0,0.2)" stroke-width="0.8"/>`,
    // Arms up and wide
    `<path d="M18,24 Q10,18 7,12" stroke="${SKIN}" stroke-width="3.5" stroke-linecap="round" fill="none"/>`,
    `<path d="M42,24 Q50,18 53,12" stroke="${SKIN}" stroke-width="3.5" stroke-linecap="round" fill="none"/>`,
    // Gloves
    `<circle cx="7" cy="11" r="3.5" fill="${shirt}"/>`,
    `<circle cx="53" cy="11" r="3.5" fill="${shirt}"/>`,
    // Neck + Head
    neck(), head(30, 12),
  ].join(''));
}

function trainerSvg(jacket: string): string {
  return svg([
    // Legs (full-length tracksuit pants)
    `<path d="M25,52 L25,65" stroke="${TRAINER_PANTS}" stroke-width="6" stroke-linecap="round" fill="none"/>`,
    `<path d="M35,52 L35,65" stroke="${TRAINER_PANTS}" stroke-width="6" stroke-linecap="round" fill="none"/>`,
    // Shoes (dark trainers)
    boot(25, 66, false), boot(35, 66, true),
    // Jacket/Torso
    `<path d="M19,22 C19,20 30,19 30,19 C30,19 41,20 41,22 L39,48 L21,48 Z" fill="${jacket}" stroke="rgba(0,0,0,0.15)" stroke-width="0.5"/>`,
    // Jacket zipper line
    `<line x1="30" y1="22" x2="30" y2="48" stroke="rgba(0,0,0,0.15)" stroke-width="0.5"/>`,
    // Collar (polo/zip collar)
    `<path d="M27,20 L30,23 L33,20" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="0.8"/>`,
    // Left arm (at side)
    `<path d="M19,24 Q15,33 17,40" stroke="${jacket}" stroke-width="4" stroke-linecap="round" fill="none"/>`,
    // Right arm (slightly forward, whistle gesture)
    `<path d="M41,24 Q45,30 44,36" stroke="${jacket}" stroke-width="4" stroke-linecap="round" fill="none"/>`,
    // Hands
    `<circle cx="17" cy="40" r="2" fill="${SKIN}"/>`,
    `<circle cx="44" cy="36" r="2" fill="${SKIN}"/>`,
    // Neck + Head
    neck(), head(30, 12),
  ].join(''));
}

export function getPlayerSvg(pose: PlayerPose, shirtColor: string): string {
  switch (pose) {
    case 'stand': return standSvg(shirtColor);
    case 'run': return runSvg(shirtColor);
    case 'pass': return passSvg(shirtColor);
    case 'goalkeeper': return goalkeeperSvg(shirtColor);
    case 'trainer': return trainerSvg(shirtColor);
  }
}
