import type { Recipe } from "./types";

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, max = 2): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
      if (lines.length === max - 1) break;
    } else {
      line = test;
    }
  }
  if (line && lines.length < max) lines.push(line);
  if (lines.length === max) {
    const last = lines[max - 1];
    while (ctx.measureText(last + "…").width > maxWidth && lines[max - 1].length > 0) {
      lines[max - 1] = lines[max - 1].slice(0, -1);
    }
    if (text.split(" ").join(" ").length > lines.join(" ").length) lines[max - 1] += "…";
  }
  return lines;
}

function programGradient(program: string): [string, string] {
  const p = program.toLowerCase();
  if (p.includes("masse") || p.includes("bulk")) return ["#FB923C", "#EA580C"];
  if (p.includes("sèche") || p.includes("cut") || p.includes("definici")) return ["#F472B6", "#DB2777"];
  if (p.includes("perte") || p.includes("loss") || p.includes("emagre")) return ["#38BDF8", "#0284C7"];
  if (p.includes("plaisir") || p.includes("indulg") || p.includes("prazer") || p.includes("享受")) return ["#F59E0B", "#D97706"];
  return ["#4CAF82", "#2E7D5A"];
}

export async function buildRecipeShareImage(
  recipe: Recipe,
  watermark: boolean,
): Promise<Blob> {
  const W = 375;
  const H = 500;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas non disponible");

  // 1. Gradient background
  const [c1, c2] = programGradient(recipe.program);
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, c1);
  grad.addColorStop(1, c2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // 2. Dark overlay bottom half
  const overlay = ctx.createLinearGradient(0, H / 2, 0, H);
  overlay.addColorStop(0, "rgba(0,0,0,0)");
  overlay.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = overlay;
  ctx.fillRect(0, H / 2, W, H / 2);

  // 3. Top-left logo
  ctx.fillStyle = "#fff";
  ctx.font = "bold 18px -apple-system, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("FridgeChef", 20, 32);

  // 4. Title
  ctx.font = "bold 26px -apple-system, system-ui, sans-serif";
  const lines = wrap(ctx, recipe.titre, W - 40, 2);
  let y = H - 130 - (lines.length - 1) * 30;
  for (const ln of lines) {
    ctx.fillText(ln, 20, y);
    y += 32;
  }

  // 5. Macro pills
  const pills = [
    `🔥 ${recipe.calories} kcal`,
    `💪 ${Math.round(recipe.proteines)}g`,
    `🌾 ${Math.round(recipe.glucides)}g`,
  ];
  ctx.font = "600 13px -apple-system, system-ui, sans-serif";
  let px = 20;
  const py = H - 60;
  for (const p of pills) {
    const w = ctx.measureText(p).width + 22;
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    roundRect(ctx, px, py, w, 28, 14);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillText(p, px + 11, py + 19);
    px += w + 8;
  }

  // 6. Watermark
  if (watermark) {
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "italic 11px -apple-system, system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("Généré avec FridgeChef", W - 16, H - 14);
  } else {
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = "italic 11px -apple-system, system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("FridgeChef", W - 16, H - 14);
  }

  return await new Promise<Blob>((res, rej) => {
    canvas.toBlob(
      (b) => (b ? res(b) : rej(new Error("toBlob failed"))),
      "image/png",
    );
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

export async function shareOrDownload(blob: Blob, title: string, filename = "recette-fridgechef.png"): Promise<"shared" | "downloaded"> {
  const file = new File([blob], filename, { type: "image/png" });
  const nav = navigator as Navigator & {
    canShare?: (d: { files?: File[] }) => boolean;
  };
  if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], title });
      return "shared";
    } catch {
      /* fall through */
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded";
}
