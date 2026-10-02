export type TopicStatus = 'core' | 'later';

export type Topic = {
  slug: string;
  title: string;
  status: TopicStatus;
  // Целевой размер банка; только у тем ядра.
  target?: number;
};

// Закрытый справочник тем. Ядро участвует в банке на старте,
// резерв хранится в данных со статусом «позже».
export const TOPICS: readonly Topic[] = [
  { slug: 'javascript', title: 'JavaScript', status: 'core', target: 260 },
  { slug: 'typescript', title: 'TypeScript', status: 'core', target: 66 },
  { slug: 'react', title: 'React', status: 'core', target: 130 },
  { slug: 'html', title: 'HTML', status: 'core', target: 150 },
  { slug: 'css', title: 'CSS', status: 'core', target: 80 },
  { slug: 'web', title: 'Веб и сети', status: 'later' },
  { slug: 'accessibility', title: 'Доступность', status: 'later' },
  { slug: 'performance', title: 'Производительность', status: 'later' },
  { slug: 'state-management', title: 'Управление состоянием', status: 'later' },
  { slug: 'security', title: 'Безопасность', status: 'later' },
  { slug: 'oop-fp', title: 'ООП и функциональное программирование', status: 'later' },
  { slug: 'architecture', title: 'Архитектура', status: 'later' },
  { slug: 'algorithms', title: 'Алгоритмы и структуры данных', status: 'later' },
  { slug: 'nodejs', title: 'Node.js', status: 'later' },
  { slug: 'angular', title: 'Angular', status: 'later' },
  { slug: 'vue', title: 'Vue', status: 'later' },
  { slug: 'testing', title: 'Тестирование', status: 'later' },
  { slug: 'tools', title: 'Инструменты и инфраструктура', status: 'later' },
  { slug: 'soft-skills', title: 'Soft skills', status: 'later' },
  { slug: 'practical-tasks', title: 'Практические задачи', status: 'later' },
  { slug: 'browser-rendering', title: 'Рендеринг браузера', status: 'later' },
  { slug: 'other', title: 'Прочее', status: 'later' },
];

export const TOPIC_SLUGS: readonly string[] = TOPICS.map((topic) => topic.slug);
export const CORE_TOPIC_SLUGS: readonly string[] = TOPICS.filter(
  (topic) => topic.status === 'core',
).map((topic) => topic.slug);

export function isKnownTopic(slug: string): boolean {
  return TOPIC_SLUGS.includes(slug);
}

export function isCoreTopic(slug: string): boolean {
  return CORE_TOPIC_SLUGS.includes(slug);
}

export function topicTitle(slug: string): string {
  return TOPICS.find((topic) => topic.slug === slug)?.title ?? slug;
}
