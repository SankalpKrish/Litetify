export const PIN_REORDER_HOLD_MS = 280;
export const PIN_REORDER_CANCEL_PX = 12;

export function moveItem<T>(
  items: readonly T[],
  from: number,
  to: number,
): T[] {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= items.length ||
    to >= items.length
  ) {
    return items as T[];
  }
  const next = items.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/**
 * Drop index for a dragged pin from the cursor's Y, using every *other*
 * pin's midpoint. The dragged row is ignored so the hole follows the
 * pointer instead of jumping extra slots as that row moves.
 */
export function dropIndexFromClientY(
  list: HTMLElement,
  clientY: number,
  draggingUri: string,
): number {
  const items = list.querySelectorAll<HTMLElement>('[data-pin-uri]');
  let index = 0;
  for (const el of items) {
    const uri = el.getAttribute('data-pin-uri');
    if (uri === draggingUri || el.getAttribute('aria-grabbed') === 'true') {
      continue;
    }
    const rect = el.getBoundingClientRect();
    if (rect.height <= 0) continue;
    if (clientY > rect.top + rect.height / 2) index += 1;
  }
  return index;
}
