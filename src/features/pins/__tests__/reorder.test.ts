import { describe, expect, it, vi } from 'vitest';
import { dropIndexFromClientY, moveItem } from '../reorder';

describe('moveItem', () => {
  it('moves an item forward', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('moves an item backward', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('returns the same array reference when the index does not change', () => {
    const items = ['a', 'b', 'c'];
    expect(moveItem(items, 1, 1)).toBe(items);
  });

  it('returns the same array reference for out-of-range indexes', () => {
    const items = ['a', 'b'];
    expect(moveItem(items, -1, 0)).toBe(items);
    expect(moveItem(items, 0, 2)).toBe(items);
    expect(moveItem(items, 2, 0)).toBe(items);
  });
});

describe('dropIndexFromClientY', () => {
  function rect(top: number, height: number): DOMRect {
    return {
      top,
      bottom: top + height,
      height,
      left: 0,
      right: 200,
      width: 200,
      x: 0,
      y: top,
      toJSON() {
        return {};
      },
    };
  }

  function listWithItems() {
    const list = document.createElement('div');
    for (let i = 0; i < 3; i++) {
      const el = document.createElement('button');
      el.dataset.pinUri = `u${i}`;
      vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(rect(i * 40, 40));
      list.appendChild(el);
    }
    document.body.append(list);
    return list;
  }

  it('places the drop from the cursor against the other items only', () => {
    const list = listWithItems();

    // u0 is dragging. Others sit at 40–80 (mid 60) and 80–120 (mid 100).
    expect(dropIndexFromClientY(list, 10, 'u0')).toBe(0);
    expect(dropIndexFromClientY(list, 50, 'u0')).toBe(0);
    expect(dropIndexFromClientY(list, 70, 'u0')).toBe(1);
    expect(dropIndexFromClientY(list, 110, 'u0')).toBe(2);

    list.remove();
  });

  it('does not skip a slot when the cursor is over the next item', () => {
    const list = listWithItems();

    // Cursor in the lower half of u1 should insert after u1, not after u2.
    expect(dropIndexFromClientY(list, 70, 'u0')).toBe(1);

    list.remove();
  });
});
