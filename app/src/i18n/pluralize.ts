export type PluralForms = { one: string; few: string; many: string };

export function pluralize(count: number, forms: PluralForms): string {
  const mod10 = Math.abs(count) % 10;
  const mod100 = Math.abs(count) % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return forms.one;
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return forms.few;
  }
  return forms.many;
}
