export type SourceFile = {
  url: string;
  name: string;
  topicHint?: string;
};

export type SourceConfig = {
  id: string;
  title: string;
  license: 'agpl-3.0' | 'unknown';
  // true — вопрос нельзя копировать дословно, при генерации переформулировать.
  rephrase: boolean;
  files: SourceFile[];
};

const YK_BASE =
  'https://raw.githubusercontent.com/YauhenKavalchuk/interview-questions/main/questions';

// 23 тематических файла YauhenKavalchuk: только вопросы и ссылки на видео.
const yauhenkavalchukFiles: SourceFile[] = [
  { name: 'web.md', url: `${YK_BASE}/web.md`, topicHint: 'web' },
  { name: 'architecture.md', url: `${YK_BASE}/architecture.md`, topicHint: 'architecture' },
  { name: 'security.md', url: `${YK_BASE}/security.md`, topicHint: 'security' },
  { name: 'browser-rendering.md', url: `${YK_BASE}/browser-rendering.md`, topicHint: 'browser-rendering' },
  { name: 'oop-fp.md', url: `${YK_BASE}/oop-fp.md`, topicHint: 'oop-fp' },
  { name: 'html.md', url: `${YK_BASE}/html.md`, topicHint: 'html' },
  { name: 'css.md', url: `${YK_BASE}/css.md`, topicHint: 'css' },
  { name: 'js.md', url: `${YK_BASE}/js.md`, topicHint: 'javascript' },
  { name: 'browser-js.md', url: `${YK_BASE}/browser-js.md`, topicHint: 'javascript' },
  { name: 'async-js.md', url: `${YK_BASE}/async-js.md`, topicHint: 'javascript' },
  { name: 'es.md', url: `${YK_BASE}/es.md`, topicHint: 'javascript' },
  { name: 'accessibility.md', url: `${YK_BASE}/accessibility.md`, topicHint: 'accessibility' },
  { name: 'performance.md', url: `${YK_BASE}/performance.md`, topicHint: 'performance' },
  { name: 'ts.md', url: `${YK_BASE}/ts.md`, topicHint: 'typescript' },
  { name: 'react.md', url: `${YK_BASE}/react.md`, topicHint: 'react' },
  { name: 'vue-js.md', url: `${YK_BASE}/vue-js.md`, topicHint: 'vue' },
  { name: 'angular.md', url: `${YK_BASE}/angular.md`, topicHint: 'angular' },
  { name: 'state-management.md', url: `${YK_BASE}/state-management.md`, topicHint: 'state-management' },
  { name: 'node-js.md', url: `${YK_BASE}/node-js.md`, topicHint: 'nodejs' },
  { name: 'testing.md', url: `${YK_BASE}/testing.md`, topicHint: 'testing' },
  { name: 'tools.md', url: `${YK_BASE}/tools.md`, topicHint: 'tools' },
  { name: 'soft-skills.md', url: `${YK_BASE}/soft-skills.md`, topicHint: 'soft-skills' },
  { name: 'practical-tasks.md', url: `${YK_BASE}/practical-tasks.md`, topicHint: 'practical-tasks' },
];

export const sources: SourceConfig[] = [
  {
    id: 'yauhenkavalchuk',
    title: 'YauhenKavalchuk/interview-questions',
    license: 'unknown',
    rephrase: true,
    files: yauhenkavalchukFiles,
  },
  {
    id: 'hexlet',
    title: 'Hexlet/ru-interview-questions',
    license: 'agpl-3.0',
    rephrase: false,
    files: [
      {
        name: 'frontend.md',
        url: 'https://raw.githubusercontent.com/Hexlet/ru-interview-questions/main/questions/frontend.md',
      },
    ],
  },
];
