/**
 * Ugandan phone numbers reach us in several shapes: 0772123456, 772123456,
 * 256772123456 or +256772123456. Employees' `tel` values in the database were
 * typed by hand, so we match against every shape instead of guessing one.
 */
export function phoneCandidates(input: string): string[] {
  const digits = (input ?? '').replace(/\D/g, '');
  let local = digits;
  if (local.startsWith('256')) local = local.slice(3);
  if (local.startsWith('0')) local = local.slice(1);

  const raw = (input ?? '').trim();
  const shapes = [raw, local, `0${local}`, `256${local}`, `+256${local}`];
  return Array.from(new Set(shapes.filter((s) => s.length > 0)));
}
