import crypto from 'crypto';

export function normalizeIngredientName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

export function slugifyForIngredient(name: string, id: string) {
  const slug = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  return { slug, filename: `ingredients/${slug}__${id}.png` };
}

export function deriveIngredientIdentity(rawName: string) {
  const canonicalName = normalizeIngredientName(rawName);
  const hash = crypto.createHash('sha1').update(canonicalName).digest('hex').slice(0, 8);
  const slug = canonicalName.replace(/\s+/g, '-');
  const id = `${slug}-${hash}`;
  const { filename } = slugifyForIngredient(canonicalName, id);
  return { id, canonicalName, slug, filename };
}
