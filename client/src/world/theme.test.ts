import { describe, expect, it } from 'vitest';
import { TACTICAL_THEME } from '../art/theme';
import { normalizeOfficeTheme, officeThemeOptions, seasonalThemeFor } from './api';

describe('tema do escritório', () => {
  const at = (month: number, day: number, hour = 12) => new Date(2026, month - 1, day, hour);

  it('opções: Natal/Halloween no clássico, Guerra/Destruição no tático', () => {
    expect(officeThemeOptions(false)).toEqual(['auto', 'none', 'christmas', 'halloween']);
    expect(officeThemeOptions(true)).toEqual(['auto', 'none', 'war', 'destruction']);
    expect(officeThemeOptions()).toEqual(officeThemeOptions(TACTICAL_THEME));
  });

  it('escolha salva de outro visual vale como automático (sem quebrar)', () => {
    expect(normalizeOfficeTheme('christmas', true)).toBe('auto');
    expect(normalizeOfficeTheme('halloween', true)).toBe('auto');
    expect(normalizeOfficeTheme('war', false)).toBe('auto');
    expect(normalizeOfficeTheme('destruction', false)).toBe('auto');
    expect(normalizeOfficeTheme(undefined, true)).toBe('auto');
    expect(normalizeOfficeTheme('war', true)).toBe('war');
    expect(normalizeOfficeTheme('halloween', false)).toBe('halloween');
    // no tático, Natal salvo cai no automático: o prédio todo fica limpo (as zonas decidem)
    expect(seasonalThemeFor('christmas', at(12, 1), true)).toBe('none');
  });

  it('tático: o automático não põe Natal nem Halloween; Guerra e Destruição valem o ano todo', () => {
    for (const date of [at(1, 1), at(10, 13), at(12, 1)]) {
      expect(seasonalThemeFor('auto', date, true)).toBe('none');
      expect(seasonalThemeFor('none', date, true)).toBe('none');
      expect(seasonalThemeFor('war', date, true)).toBe('war');
      expect(seasonalThemeFor('destruction', date, true)).toBe('destruction');
    }
  });

  it('clássico: automático segue o calendário (hora local)', () => {
    const f = (d: Date, t: Parameters<typeof seasonalThemeFor>[0] = 'auto') => seasonalThemeFor(t, d, false);
    expect(f(at(9, 30, 23))).toBe('none');
    expect(f(at(10, 1, 0))).toBe('halloween');
    expect(f(at(10, 31, 23))).toBe('halloween');
    expect(f(at(11, 1, 0))).toBe('christmas');
    expect(f(at(12, 26, 23))).toBe('christmas');
    expect(f(at(12, 27, 0))).toBe('none');
    expect(f(at(1, 1))).toBe('none');
    expect(f(at(7, 15))).toBe('none');
    // Sem preferência (opções antigas do mundo) vale o automático.
    expect(f(at(10, 13), undefined)).toBe('halloween');
  });

  it('clássico: escolha fixa vale o ano todo', () => {
    for (const date of [at(1, 1), at(10, 13), at(12, 1)]) {
      expect(seasonalThemeFor('none', date, false)).toBe('none');
      expect(seasonalThemeFor('christmas', date, false)).toBe('christmas');
      expect(seasonalThemeFor('halloween', date, false)).toBe('halloween');
    }
  });
});
