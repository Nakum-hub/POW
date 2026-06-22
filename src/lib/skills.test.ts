import { describe, expect, it } from 'vitest';
import type { SkillCategory } from '../types';
import { publicSkillCategoryOrder, skillCategoryMeta } from './skills';

const ALL_CATEGORIES: SkillCategory[] = [
  'language',
  'framework',
  'concept',
  'devops',
  'practice',
  'database',
];

describe('skill category metadata', () => {
  it('defines display metadata for every skill category', () => {
    for (const category of ALL_CATEGORIES) {
      const meta = skillCategoryMeta[category];
      expect(meta, `missing meta for ${category}`).toBeDefined();
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.badgeClass.length).toBeGreaterThan(0);
    }
  });

  it('orders every category exactly once for public display', () => {
    expect([...publicSkillCategoryOrder].sort()).toEqual([...ALL_CATEGORIES].sort());
    expect(new Set(publicSkillCategoryOrder).size).toBe(publicSkillCategoryOrder.length);
  });

  it('includes the practice category that backs the recruiter search Practices tab', () => {
    expect(publicSkillCategoryOrder).toContain('practice');
    expect(skillCategoryMeta.practice.label).toBe('Practices');
  });
});
