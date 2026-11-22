// Ícones táticos (pixel art, 10x10): trocam os de escritório quando o tema tático está ligado (art/theme.ts).
// Mesmo significado de cada botão, com objetos de campanha: mira, rádio, munição, dossiê, cronômetro, medalha...
import { TACTICAL_THEME } from '../art/theme';
import { pixelIcon } from './icons';

export const TACTICAL_ICON_ROWS = {
  /** Visão geral: retícula de mira. */
  overview: ['....##....', '..##..##..', '.#......#.', '.#......#.', '###.##.###', '###.##.###', '.#......#.', '.#......#.', '..##..##..', '....##....'],
  /** Rádio (feed): rádio comunicador com antena. */
  feed: ['...#......', '...#......', '...#......', '..######..', '..#....#..', '..#....#..', '..######..', '..#.#.##..', '..##.#.#..', '..######..'],
  /** Configurações: chave de manutenção. */
  settings: ['......###.', '.....##.#.', '.....#...#', '......#.##', '.....####.', '....###...', '...###....', '..###.....', '.###......', '.##.......'],
  /** Ajuda: manual de campo com "?". */
  help: ['.########.', '.#......##', '.#.####.##', '.#....#.##', '.#...##.##', '.#..##..##', '.#......##', '.#..##..##', '.#......##', '.#########'],
  /** Relatório de missões: dossiê com estrela. */
  clock: ['.###......', '##########', '#........#', '#...##...#', '#.######.#', '#..####..#', '#..#..#..#', '#........#', '##########'],
  /** Missões cumpridas: medalha com fita. */
  delivery: ['###....###', '.##....##.', '..##..##..', '...####...', '..##..##..', '.##.##.##.', '.#.####.#.', '.##.##.##.', '..##..##..', '...####...'],
  /** Meu dia: três munições de alturas diferentes. */
  day: ['.......##.', '....##.##.', '....##.##.', '.##.##.##.', '.##.##.##.', '.##.##.##.', '..........', '.##.##.##.', '.##.##.##.', '##########'],
  /** Timelapse: cronômetro de rodada. */
  timelapse: ['...####...', '....##....', '..######..', '.#......#.', '#....#...#', '#....#...#', '#...##...#', '#........#', '.#......#.', '..######..'],
} as const;

type Name = keyof typeof TACTICAL_ICON_ROWS;

/** Ícone tático pelo nome, ou o original se o tema tático estiver desligado. */
export function tacticalIcon(name: Name, original: string): string {
  return TACTICAL_THEME ? pixelIcon(TACTICAL_ICON_ROWS[name]) : original;
}
