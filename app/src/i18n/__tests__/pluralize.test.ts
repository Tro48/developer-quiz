import { pluralize } from '@/i18n/pluralize';

const forms = { one: 'вопрос', few: 'вопроса', many: 'вопросов' };

describe('pluralize', () => {
  it.each([
    [1, 'вопрос'],
    [2, 'вопроса'],
    [5, 'вопросов'],
    [11, 'вопросов'],
    [21, 'вопрос'],
    [22, 'вопроса'],
    [25, 'вопросов'],
    [101, 'вопрос'],
    [111, 'вопросов'],
  ])('%i → %s', (count, expected) => {
    expect(pluralize(count, forms)).toBe(expected);
  });
});
