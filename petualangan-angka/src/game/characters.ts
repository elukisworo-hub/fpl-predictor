import type { CharacterId } from './types';

export const CHARACTER_NAMES: Record<CharacterId, string> = {
  foxy: 'Foxy',
  bubu: 'Bubu',
  mimi: 'Mimi',
  pando: 'Pando',
};

export interface CharacterInfo {
  id: CharacterId;
  name: string;
  animal: string;
  role: string;
  personality: string;
  color: string;
}

export const CHARACTERS: Record<CharacterId, CharacterInfo> = {
  foxy: {
    id: 'foxy',
    name: 'Foxy',
    animal: 'Rubah',
    role: 'Guru Penjumlahan',
    personality: 'Ceria dan suka berlari kencang.',
    color: '#FF8A3D',
  },
  bubu: {
    id: 'bubu',
    name: 'Bubu',
    animal: 'Beruang',
    role: 'Guru Pengurangan',
    personality: 'Sabar, lembut, dan suka madu.',
    color: '#B07A4F',
  },
  mimi: {
    id: 'mimi',
    name: 'Mimi',
    animal: 'Kelinci',
    role: 'Pendongeng Soal Cerita',
    personality: 'Suka bercerita dan makan wortel.',
    color: '#FF8FB8',
  },
  pando: {
    id: 'pando',
    name: 'Pando',
    animal: 'Panda',
    role: 'Pemandu Petualangan',
    personality: 'Riang, berani, dan selalu menyemangati.',
    color: '#3B2E5A',
  },
};
