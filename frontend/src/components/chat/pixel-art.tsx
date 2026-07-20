"use client";

const CAT_GRID = [
  "  ██████  ",
  " ████████ ",
  "██  ██  ██",
  "██      ██",
  "██████████",
  "██  ██  ██",
  "██  ██  ██",
  "  ██  ██  ",
];

const WHALE_GRID = [
  "    ████████████    ",
  "  ████████████████  ",
  " ██████████████████ ",
  "████████████████████",
  "██████    ██████████",
  "████████████████████",
  " ██████████████████ ",
  "  ████████████████  ",
  "    ████████████    ",
];

const STAR_GRID = [
  "  ██  ",
  "██████",
  "  ██  ",
];

function PixelSVG({ grid, color, size = 8 }: { grid: string[]; color: string; size?: number }) {
  const w = Math.max(...grid.map((r) => r.length));
  const h = grid.length;
  const rects: { x: number; y: number }[] = [];
  grid.forEach((row, y) => {
    row.split("").forEach((ch, x) => {
      if (ch !== " ") rects.push({ x, y });
    });
  });
  return (
    <svg width={w * size} height={h * size} viewBox={`0 0 ${w} ${h}`} className="block">
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={1} height={1} fill={color} shapeRendering="crispEdges" />
      ))}
    </svg>
  );
}

interface PixelArtBaseProps {
  className?: string;
  color?: string;
  size?: number;
}

export function PixelCat({ className, color = "#d79921", size }: PixelArtBaseProps) {
  return (
    <div className={className} style={{ filter: "drop-shadow(0 0 4px rgba(215, 153, 33, 0.15))" }}>
      <PixelSVG grid={CAT_GRID} color={color} size={size} />
    </div>
  );
}

export function PixelWhale({ className, color = "#458588", size }: PixelArtBaseProps) {
  return (
    <div className={className} style={{ filter: "drop-shadow(0 0 4px rgba(69, 133, 136, 0.15))" }}>
      <PixelSVG grid={WHALE_GRID} color={color} size={size} />
    </div>
  );
}

export function PixelStar({ className, color = "#d65d0e", size }: PixelArtBaseProps) {
  return (
    <div className={className}>
      <PixelSVG grid={STAR_GRID} color={color} size={size} />
    </div>
  );
}

export function WalkingCat({ className }: { className?: string }) {
  return (
    <div className={`${className} pointer-events-none`}>
      <div className="animate-[walk_25s_linear_infinite]">
        <div className="animate-[walk-fade_25s_linear_infinite]">
          <PixelSVG grid={CAT_GRID} color="#d79921" size={3} />
        </div>
      </div>
    </div>
  );
}
