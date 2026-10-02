import { z } from 'zod';

export const GRADES = ['junior', 'middle', 'senior'] as const;
export const STATUSES = ['parsed', 'generated', 'verified', 'rejected'] as const;

export const gradeSchema = z.enum(GRADES);
export const statusSchema = z.enum(STATUSES);

// Вопрос на этапе парсинга: ответ может отсутствовать (YauhenKavalchuk),
// грейд может быть неизвестен (классифицирует агент).
export const parsedQuestionSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+-[0-9a-f]{8}$/),
  topic: z.string().min(1),
  topicHint: z.string().optional(),
  grade: gradeSchema.optional(),
  source: z.string().min(1),
  sourceUrl: z.string().url(),
  question: z.string().min(1),
  answer: z.string(),
  status: z.literal('parsed'),
});
export type ParsedQuestion = z.infer<typeof parsedQuestionSchema>;

// Вопрос после генерации: 4 варианта, один верный, пояснение, ссылки на документацию.
export const generatedQuestionSchema = parsedQuestionSchema.extend({
  grade: gradeSchema,
  options: z.tuple([z.string().min(1), z.string().min(1), z.string().min(1), z.string().min(1)]),
  correctIndex: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  explanation: z.string().min(1),
  docsRefs: z.array(z.string().url()).min(1),
  status: z.enum(['generated', 'verified', 'rejected']),
  rejectReason: z.string().optional(),
});
export type GeneratedQuestion = z.infer<typeof generatedQuestionSchema>;

// Вопрос, попавший в банк: только verified, без причины отказа.
export const bankQuestionSchema = generatedQuestionSchema
  .omit({ status: true, rejectReason: true })
  .extend({ status: z.literal('verified') });
export type BankQuestion = z.infer<typeof bankQuestionSchema>;
