import type { Recipe } from "./types";
import { programGradient } from "./storage";

export async function buildRecipeCardPng(
  recipe: Recipe,
  premium: boolean,
): Promise<Blob | null> {
  if (typeof document === "undefined") return null;
  const W = 375;
  const H = 500;
  const canvas = document.createElement("canvas");
  canvas.width = W * 2;
  canvas.height = H * 2;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.scale(2, 2);

  // Background gradient
  const [c1, c2] = programGradient(recipe.program);
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, c1);
  grad.addColorStop(1, c2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Subtle overlay
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.fillRect(0, 0, W, H);

  // Logo top left
  ctx.fillStyle = "#fff";
  ctx.font = "bold 18px -apple-system, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("🥦 FridgeChef", 24, 36);

  // Program pill
  ctx.font = "bold 11px -apple-system, system-ui, sans-serif";
  const pillText = recipe.program.toUpperCase();
  const pillW = ctx.measureText(pillText).width + 20;
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  roundRect(ctx, 24, 70, pillW, 24, 12);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.fillText(pillText, 34, 86);

  // Title (wrap)
  ctx.fillStyle = "#fff";
  ctx.font = "bold 28px -apple-system, system-ui, sans-serif";
  wrapText(ctx, recipe.titre, 24, 130, W - 48, 32);

  // Macro pills
  const macros = [
    { label: "kcal", value: `${recipe.calories}` },
    { label: "prot.", value: `${Math.round(recipe.proteines)}g` },
    { label: "gluc.", value: `${Math.round(recipe.glucides)}g` },
  ];
  const pillH = 64;
  const pillGap = 10;
  const pillCellW = (W - 48 - pillGap * 2) / 3;
  macros.forEach((m, i) => {
    const x = 24 + i * (pillCellW + pillGap);
    const y = H - 150;
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    roundRect(ctx, x, y, pillCellW, pillH, 14);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "bold 20px -apple-system, system-ui, sans-serif";
    ctx.fillText(m.value, x + pillCellW / 2, y + 28);
    ctx.font = "11px -apple-system, system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText(m.label, x + pillCellW / 2, y + 46);
  });

  // QR placeholder bottom left
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  roundRect(ctx, 24, H - 70, 46, 46, 6);
  ctx.fill();
  ctx.fillStyle = "#000";
  // pattern
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if ((r + c + (r * c)) % 2 === 0) {
        ctx.fillRect(28 + c * 8, H - 66 + r * 8, 6, 6);
      }
    }
  }

  // Watermark
  ctx.textAlign = "right";
  ctx.font = "11px -apple-system, system-ui, sans-serif";
  ctx.fillStyle = premium ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.95)";
  ctx.fillText(
    premium ? "fridgechef.app" : "Généré avec FridgeChef",
    W - 24,
    H - 30,
  );

  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/png");
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(" ");
  let line = "";
  let yy = y;
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, yy);
      line = w;
      yy += lineHeight;
      if (yy - y > lineHeight * 3) {
        // truncate to 3 lines
        ctx.fillText(line + "…", x, yy);
        return;
      }
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, yy);
}

export async function shareRecipe(recipe: Recipe, premium: boolean) {
  const blob = await buildRecipeCardPng(recipe, premium);
  if (!blob) return { kind: "error" as const };
  const filename = `${recipe.titre.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`;
  const file = new File([blob], filename, { type: "image/png" });
  const nav = typeof navigator !== "undefined" ? navigator : null;
  if (nav && "share" in nav && "canShare" in nav && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({
        files: [file],
        title: recipe.titre,
        text: recipe.description,
      });
      return { kind: "shared" as const };
    } catch {
      // user cancelled
      return { kind: "cancelled" as const };
    }
  }
  // Fallback: download
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { kind: "downloaded" as const };
}

export function formatShoppingForWhatsApp(
  cats: { nom: string; items: string[] }[],
): string {
  let s = "*🛒 Ma liste de courses FridgeChef*\n\n";
  for (const c of cats) {
    s += `*${c.nom}*\n`;
    for (const it of c.items) s += `• ${it}\n`;
    s += "\n";
  }
  s += "_Généré avec FridgeChef_";
  return s;
}

export function formatShoppingFlat(
  cats: { nom: string; items: string[] }[],
): string {
  return cats.flatMap((c) => c.items).join(", ");
}

export function shareToWhatsApp(text: string) {
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  if (typeof window !== "undefined") window.open(url, "_blank");
}
