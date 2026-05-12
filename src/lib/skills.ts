import { SkillCategory } from '../types';

export const skillCategoryMeta: Record<
  SkillCategory,
  { label: string; badgeClass: string; accentClass: string; dotClass: string }
> = {
  language: {
    label: 'Languages',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    accentClass: 'text-blue-600',
    dotClass: 'bg-blue-500',
  },
  framework: {
    label: 'Frameworks',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    accentClass: 'text-purple-600',
    dotClass: 'bg-purple-500',
  },
  concept: {
    label: 'Concepts',
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
    accentClass: 'text-teal-600',
    dotClass: 'bg-teal-500',
  },
  devops: {
    label: 'DevOps',
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
    accentClass: 'text-orange-600',
    dotClass: 'bg-orange-500',
  },
  practice: {
    label: 'Practices',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    accentClass: 'text-rose-600',
    dotClass: 'bg-rose-500',
  },
  database: {
    label: 'Databases',
    badgeClass: 'bg-green-50 text-green-700 border-green-200',
    accentClass: 'text-green-600',
    dotClass: 'bg-green-500',
  },
};

export const publicSkillCategoryOrder: SkillCategory[] = [
  'language',
  'framework',
  'concept',
  'devops',
  'database',
  'practice',
];
