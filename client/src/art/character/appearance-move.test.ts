// O sorteio da aparência mora em shared/appearance-flat.ts; o módulo antigo só re-exporta (a regressão das 20
// sementes fica em shared/appearance-flat.test.ts).
import { describe, expect, it } from 'vitest';
import * as shared from '../../../../shared/appearance-flat';
import { appearanceFromSeed, SKINS } from './appearance';

describe('client/src/art/character/appearance', () => {
  it('re-exporta o sorteio e as cores de pele de shared/', () => {
    expect(appearanceFromSeed).toBe(shared.appearanceFromSeed);
    expect(SKINS).toBe(shared.SKINS);
  });
});
