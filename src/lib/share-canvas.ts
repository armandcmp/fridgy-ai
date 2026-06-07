import type { Recipe } from "./types";

const PROGRAM_GRADIENTS: Record<string, [string, string]> = {
  "Prise de masse": ["#F97316", "#C2410C"],
  "Sèche": ["#EF4444", "#991B1B"],
  "Perte de poids": ["#0EA5E9", "#0369A1"],
  "Équilibre": ["#4CAF82", "#15803D"],
  "Plaisir": ["#A855F7", "#6B21A8"],
};

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function buildRecipeImage(recipe: Recipe, watermark: boolean): Promise<Blob> {
  const W = 750;
  const H = 1000;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const [c1, c2] = PROGRAM_GRADIENTS[recipe.program] ?? ["#4CAF82", "#15803D"];
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, c1);
  grad.addColorStop(1, c2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // dark overlay bottom half
  const overlay = ctx.createLinearGradient(0, H / 2, 0, H);
  overlay.addColorStop(0, "rgba(0,0,0,0)");
  overlay.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = overlay;
  ctx.fillRect(0, H / 2, W, H / 2);

  // Logo top left
  ctx.fillStyle = "#fff";
  ctx.font = "bold 36px -apple-system, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("🥦 FridgeChef", 40, 70);

  // Program badge
  ctx.font = "600 22px -apple-system, system-ui, sans-serif";
  const pTxt = recipe.program;
  const pw = ctx.measureText(pTxt).width + 32;
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.beginPath();
  const bx = 40, by = 95, bh = 38, br = 19;
  ctx.moveTo(bx + br, by);
  ctx.arcTo(bx + pw, by, bx + pw, by + bh, br);
  ctx.arcTo(bx + pw, by + bh, bx, by + bh, br);
  ctx.arcTo(bx, by + bh, bx, by, br);
  ctx.arcTo(bx, by, bx + pw, by, br);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.fillText(pTxt, bx + 16, by + 26);

  // Title (bottom third, 2 lines max, 52px)
  ctx.font = "800 52px -apple-system, system-ui, sans-serif";
  const lines = wrap(ctx, recipe.titre, W - 80).slice(0, 2);
  let ty = H - 280;
  for (const ln of lines) {
    ctx.fillText(ln, 40, ty);
    ty += 60;
  }

  // Description
  if (recipe.description) {
    ctx.font = "400 24px -apple-system, system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    const dl = wrap(ctx, recipe.description, W - 80).slice(0, 2);
    let dy = ty + 10;
    for (const ln of dl) {
      ctx.fillText(ln, 40, dy);
      dy += 32;
    }
  }

  // Macro pills
  const pills = [
    `🔥 ${recipe.calories} kcal`,
    `💪 ${Math.round(recipe.proteines)}g`,
    `🌾 ${Math.round(recipe.glucides)}g`,
  ];
  ctx.font = "700 24px -apple-system, system-ui, sans-serif";
  let px = 40;
  const py = H - 120;
  const ph = 52;
  for (const p of pills) {
    const tw = ctx.measureText(p).width + 36;
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.beginPath();
    const r = 26;
    ctx.moveTo(px + r, py);
    ctx.arcTo(px + tw, py, px + tw, py + ph, r);
    ctx.arcTo(px + tw, py + ph, px, py + ph, r);
    ctx.arcTo(px, py + ph, px, py, r);
    ctx.arcTo(px, py, px + tw, py, r);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillText(p, px + 18, py + 35);
    px += tw + 12;
  }

  // Watermark bottom right
  if (watermark) {
    ctx.font = "italic 18px -apple-system, system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.textAlign = "right";
    ctx.fillText("Généré avec FridgeChef", W - 30, H - 30);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("blob fail"))), "image/png");
  });
}

export async function shareRecipeImage(recipe: Recipe, watermark: boolean) {
  const blob = await buildRecipeImage(recipe, watermark);
  const file = new File([blob], "recette-fridgechef.png", { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    await nav.share({ files: [file], title: recipe.titre });
    return "shared";
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "recette-fridgechef.png";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded";
}
