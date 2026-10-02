import { parseScore } from '@/features/result/parseScore';

describe('parseScore', () => {
  it('разбирает числа из параметров', () => {
    expect(parseScore({ correct: '12', total: '18' })).toEqual({ correct: 12, total: 18 });
  });

  it('подставляет нули вместо мусора', () => {
    expect(parseScore({ correct: 'abc', total: undefined })).toEqual({ correct: 0, total: 0 });
  });
});
