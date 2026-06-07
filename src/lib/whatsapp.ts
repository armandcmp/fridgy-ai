interface Cat {
  nom: string;
  items: string[];
}

export function formatShoppingForWhatsApp(cats: Cat[], program: string): string {
  const lines: string[] = [];
  lines.push("🛒 *Ma liste de courses FridgeChef*");
  lines.push(`Programme : *${program}*`);
  lines.push("---");
  for (const c of cats) {
    lines.push(`\n*${c.nom}*`);
    for (const item of c.items) lines.push(`☐ ${item}`);
  }
  return lines.join("\n");
}

export function formatShoppingPlain(cats: Cat[]): string {
  return cats.flatMap((c) => c.items).join(", ");
}

export function openWhatsApp(text: string) {
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}
