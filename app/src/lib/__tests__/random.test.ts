import { randomInt } from '@/lib/random';

describe('randomInt', () => {
  it('возвращает минимум при rng = 0', () => {
    expect(randomInt(15, 20, () => 0)).toBe(15);
  });

  it('возвращает максимум при rng близком к 1', () => {
    expect(randomInt(15, 20, () => 0.999999)).toBe(20);
  });

  it('округляет вниз к середине диапазона', () => {
    expect(randomInt(15, 20, () => 0.5)).toBe(18);
  });
});
