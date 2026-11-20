import type { ItemId, LeaveMode } from './types';

export interface ItemInfo {
  /** Indonesian noun (no plural form needed in Indonesian). */
  name: string;
  edible?: boolean;
  pickable?: boolean;
  ownable?: boolean;
  animal?: boolean;
  /** Where the item is usually found, e.g. "di kolam". */
  place?: string;
  /** How it leaves the scene in subtraction stories. */
  leave?: LeaveMode;
}

export const ITEMS: Record<ItemId, ItemInfo> = {
  apple: { name: 'apel', edible: true, pickable: true, ownable: true, leave: 'eat' },
  star: { name: 'bintang', place: 'di langit' },
  balloon: { name: 'balon', ownable: true, leave: 'fly' },
  candy: { name: 'permen', edible: true, ownable: true, leave: 'eat' },
  carrot: { name: 'wortel', edible: true, pickable: true, ownable: true, leave: 'eat' },
  butterfly: { name: 'kupu-kupu', animal: true, place: 'di taman', leave: 'fly' },
  bird: { name: 'burung', animal: true, place: 'di pohon', leave: 'fly' },
  cookie: { name: 'kue', edible: true, ownable: true, leave: 'eat' },
  fish: { name: 'ikan', animal: true, place: 'di kolam', leave: 'swim' },
  flower: { name: 'bunga', pickable: true, place: 'di taman' },
  strawberry: { name: 'stroberi', edible: true, pickable: true, ownable: true, leave: 'eat' },
  duck: { name: 'bebek', animal: true, place: 'di kolam', leave: 'swim' },
  bunny: { name: 'kelinci', animal: true, place: 'di kebun', leave: 'walk' },
};

export const ALL_ITEMS = Object.keys(ITEMS) as ItemId[];

export const itemsWhere = (pred: (info: ItemInfo) => boolean): ItemId[] =>
  ALL_ITEMS.filter((id) => pred(ITEMS[id]));

/** Items that look nice in counting explanations. */
export const EXPLAIN_ITEMS: ItemId[] = ['apple', 'star', 'candy', 'strawberry', 'cookie', 'flower', 'balloon'];
