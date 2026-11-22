// Temas de sala (puros): paletas claras e bem distintas. Sementes consecutivas (slots vizinhos)
// recebem temas diferentes; a ordem da lista alterna famílias de cor de propósito.
import type { RoomTheme } from './api';

/** Liga o visual tático do Niko-Pixel (bases, galpões e bunkers). `false` volta ao escritório clássico. */
export const TACTICAL_THEME = true;

const OFFICE_THEMES: readonly RoomTheme[] = [
  { carpet: '#c9d1dc', carpet2: '#bdc6d3', wall: { base: '#eef1f4', trim: '#9fb0c4', pattern: 'plain' }, accent: '#3f7fd8', deskVariant: 'white', chairVariant: 'blue' },
  { carpet: '#dbcfba', carpet2: '#d0c2ab', wall: { base: '#f6f0e5', trim: '#b99f7a', pattern: 'stripes' }, accent: '#ec8a3c', deskVariant: 'wood', chairVariant: 'black' },
  { carpet: '#c4cfbb', carpet2: '#b8c5af', wall: { base: '#f1f3ea', trim: '#93a487', pattern: 'wood_panel' }, accent: '#4cae6a', deskVariant: 'wood', chairVariant: 'green' },
  { carpet: '#cdc8de', carpet2: '#c2bbd5', wall: { base: '#f3f1f8', trim: '#a59cc4', pattern: 'plain' }, accent: '#8d66cf', deskVariant: 'white', chairVariant: 'gray' },
  { carpet: '#e4cdbe', carpet2: '#dbc1b0', wall: { base: '#f8f1eb', trim: '#c99a83', pattern: 'plain' }, accent: '#e2604f', deskVariant: 'wood', chairVariant: 'red' },
  { carpet: '#bfd9d2', carpet2: '#b2cfc7', wall: { base: '#eef6f4', trim: '#7fb3a6', pattern: 'stripes' }, accent: '#36b0b0', deskVariant: 'white', chairVariant: 'green' },
  { carpet: '#aab1bd', carpet2: '#9fa7b4', wall: { base: '#e8eaee', trim: '#6d7583', pattern: 'brick' }, accent: '#f2c14e', deskVariant: 'dark', chairVariant: 'black' },
  { carpet: '#e0cad2', carpet2: '#d6bdc6', wall: { base: '#f9f2f4', trim: '#c08ea0', pattern: 'stripes' }, accent: '#e47aa8', deskVariant: 'white', chairVariant: 'black' },
  { carpet: '#c0d2e7', carpet2: '#b3c7e0', wall: { base: '#eef4fa', trim: '#8aa6c8', pattern: 'wood_panel' }, accent: '#5b8fe0', deskVariant: 'wood', chairVariant: 'blue' },
  { carpet: '#d1c5b8', carpet2: '#c5b8aa', wall: { base: '#f4efe8', trim: '#8a6a52', pattern: 'wood_panel' }, accent: '#c9713f', deskVariant: 'dark', chairVariant: 'gray' },
];

// Tático: `carpet`/`carpet2` viram lonas e capachos (tapetes) sobre o piso; o acento colore a UI da sala.
const TACTICAL_THEMES: readonly RoomTheme[] = [
  // Vila no deserto: areia, tijolo de adobe.
  { floor: 'sand', carpet: '#8a7a55', carpet2: '#6f6244', wall: { base: '#c98f5f', trim: '#6b4a32', pattern: 'brick' }, accent: '#e0a33c', deskVariant: 'wood', chairVariant: 'black' },
  // Galpão do porto: chapa de aço, contêiner azul.
  { floor: 'plate', carpet: '#4d5a4a', carpet2: '#3e4a3c', wall: { base: '#3f6f9a', trim: '#2a3440', pattern: 'corrugated' }, accent: '#4aa8e8', deskVariant: 'dark', chairVariant: 'gray' },
  // Bunker: concreto escuro, blocos com faixa de alerta.
  { floor: 'bunker', carpet: '#5a6048', carpet2: '#4a503b', wall: { base: '#8d918c', trim: '#3a3d3b', pattern: 'cinder' }, accent: '#e3b23c', deskVariant: 'dark', chairVariant: 'black' },
  // Depósito militar: areia, contêiner verde-oliva.
  { floor: 'sand', carpet: '#5c5a48', carpet2: '#4c4a3a', wall: { base: '#5f6b3d', trim: '#2f3520', pattern: 'corrugated' }, accent: '#8fbf4a', deskVariant: 'wood', chairVariant: 'green' },
  // Pátio industrial: chapa de aço, blocos claros.
  { floor: 'plate', carpet: '#6a4f3a', carpet2: '#563f2e', wall: { base: '#b4b2aa', trim: '#4a4844', pattern: 'cinder' }, accent: '#f08a3c', deskVariant: 'dark', chairVariant: 'black' },
  // Doca vermelha: concreto escuro, contêiner ferrugem.
  { floor: 'bunker', carpet: '#4a4f58', carpet2: '#3c4048', wall: { base: '#9a4632', trim: '#3a2a24', pattern: 'corrugated' }, accent: '#e2604f', deskVariant: 'dark', chairVariant: 'gray' },
];

const THEMES = TACTICAL_THEME ? TACTICAL_THEMES : OFFICE_THEMES;

export const THEME_COUNT = THEMES.length;

export function roomTheme(seed: number): RoomTheme {
  const n = THEMES.length;
  const t = THEMES[((Math.floor(seed) % n) + n) % n];
  return { ...t, wall: { ...t.wall } };
}
