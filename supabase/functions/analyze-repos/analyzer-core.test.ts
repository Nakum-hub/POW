import { describe, expect, it } from 'vitest';
import {
  computeComplexityScore,
  computeMaturityScore,
  computeQualityScore,
  computeSecurityScore,
  computeTestingScore,
  detectContentSkills,
  detectLanguageSkills,
  detectTreeSignals,
  extensionOf,
  fileHasSecretPattern,
  fileUsesEnvVars,
  inferConceptSkills,
  snippetAround,
} from './analyzer-core';

describe('extensionOf', () => {
  it('returns the lowercased extension', () => {
    expect(extensionOf('src/App.TSX')).toBe('tsx');
  });

  it('handles nested paths and multiple dots', () => {
    expect(extensionOf('src/lib/skill.scoring.ts')).toBe('ts');
  });

  it('returns an empty string when there is no extension', () => {
    expect(extensionOf('Dockerfile')).toBe('');
  });
});

describe('snippetAround', () => {
  it('captures the matched line plus two lines of trailing context', () => {
    const content = "import React from 'react';\nfunction App() {\n  return null;\n}\n";
    const matchIndex = content.indexOf("from 'react'");

    const { snippet, lines } = snippetAround(content, matchIndex);

    expect(snippet).toContain("import React from 'react';");
    expect(lines).toEqual([1, 2, 3]);
  });

  it('does not run past the end of the file for a match on the last line', () => {
    const content = 'a\nb\nimport express from "express";';
    const matchIndex = content.lastIndexOf('import');

    const { lines } = snippetAround(content, matchIndex);

    expect(lines).toEqual([3]);
  });
});

describe('detectContentSkills', () => {
  it('detects a React import with file/line evidence', () => {
    const content = "import React from 'react';\nimport { useState } from 'react';\n";
    const detections = detectContentSkills(content);

    expect(detections).toHaveLength(1);
    expect(detections[0].skill).toBe('React');
    expect(detections[0].category).toBe('framework');
    expect(detections[0].lines).toContain(1);
  });

  it('detects multiple distinct skills in a single file', () => {
    const content = [
      "import express from 'express';",
      "import { Pool } from 'pg';",
      "import jwt from 'jsonwebtoken';",
    ].join('\n');

    const skills = detectContentSkills(content).map((d) => d.skill);

    expect(skills).toEqual(
      expect.arrayContaining(['Express', 'PostgreSQL', 'Authentication Systems']),
    );
  });

  it('returns no detections for content matching nothing', () => {
    const content = 'console.log("just a script, no framework imports here");';
    expect(detectContentSkills(content)).toHaveLength(0);
  });

  it('does not false-positive on a substring that merely contains a keyword', () => {
    // "vue" appears inside this word but is not an import of the vue package,
    // and createApp( is not present -- this should not detect Vue.
    const content = 'const avenueLength = 12;';
    expect(detectContentSkills(content)).toHaveLength(0);
  });

  it('detects Django only with a real import, not the word "django" alone', () => {
    const realImport = 'from django.db import models';
    const justTheWord = 'this project is inspired by the django framework';

    expect(detectContentSkills(realImport).map((d) => d.skill)).toContain('Django');
    expect(detectContentSkills(justTheWord)).toHaveLength(0);
  });
});

describe('fileHasSecretPattern', () => {
  it('flags a hardcoded password literal', () => {
    expect(fileHasSecretPattern('const password = "sup3rSecretValue123";')).toBe(true);
  });

  it('flags an AWS access key id', () => {
    expect(fileHasSecretPattern('const key = "AKIAABCDEFGHIJKLMNOP";')).toBe(true);
  });

  it('flags a PEM private key block', () => {
    expect(fileHasSecretPattern('-----BEGIN RSA PRIVATE KEY-----\nMIIB...')).toBe(true);
  });

  it('does not flag a reference to an env-sourced secret', () => {
    expect(fileHasSecretPattern('const apiKey = process.env.API_KEY;')).toBe(false);
  });

  it('does not flag ordinary code with no credentials', () => {
    expect(fileHasSecretPattern('function add(a, b) { return a + b; }')).toBe(false);
  });
});

describe('fileUsesEnvVars', () => {
  it('detects Node-style process.env usage', () => {
    expect(fileUsesEnvVars('const url = process.env.DATABASE_URL;')).toBe(true);
  });

  it('detects Vite-style import.meta.env usage', () => {
    expect(fileUsesEnvVars('const key = import.meta.env.VITE_API_KEY;')).toBe(true);
  });

  it('detects Python os.environ usage', () => {
    expect(fileUsesEnvVars('token = os.environ["GITHUB_TOKEN"]')).toBe(true);
  });

  it('returns false when no env-var access pattern is present', () => {
    expect(fileUsesEnvVars('const token = "literal-value";')).toBe(false);
  });
});

describe('detectLanguageSkills', () => {
  it('derives languages from file extensions', () => {
    const skills = detectLanguageSkills(['src/index.ts', 'src/App.tsx', 'main.py'], {});
    expect(skills).toEqual(new Set(['TypeScript', 'Python']));
  });

  it('also derives languages from the GitHub Languages API breakdown', () => {
    const skills = detectLanguageSkills([], { Go: 8000, Shell: 200 });
    // "Shell" has no skill mapping and should be silently ignored, not throw.
    expect(skills).toEqual(new Set(['Go']));
  });

  it('returns an empty set for an empty repo', () => {
    expect(detectLanguageSkills([], {})).toEqual(new Set());
  });
});

describe('detectTreeSignals', () => {
  const fileStructure = [
    'README.md',
    '.eslintrc.json',
    '.github/workflows/ci.yml',
    'src/index.ts',
    'src/App.tsx',
    'src/__tests__/App.test.tsx',
    'Dockerfile',
    'package.json',
  ];

  it('detects a well-equipped repo correctly across every signal', () => {
    const signals = detectTreeSignals(fileStructure);

    expect(signals.hasReadme).toBe(true);
    expect(signals.hasLinter).toBe(true);
    expect(signals.hasCI).toBe(true);
    expect(signals.hasTypes).toBe(true);
    expect(signals.hasDockerfile).toBe(true);
    expect(signals.hasSecurityMd).toBe(false);
    expect(signals.hasTerraform).toBe(false);
    expect(signals.hasK8s).toBe(false);
    expect(signals.testFileCount).toBe(1);
    expect(signals.totalFileCount).toBe(fileStructure.length);
  });

  it('treats an empty repo as one file for division safety, not zero', () => {
    const signals = detectTreeSignals([]);
    expect(signals.totalFileCount).toBe(1);
    expect(signals.testFileCount).toBe(0);
  });

  it('recognizes alternate test directory conventions', () => {
    const signals = detectTreeSignals(['tests/test_main.py', 'app/main.py']);
    expect(signals.testFileCount).toBe(1);
  });
});

describe('inferConceptSkills', () => {
  it('infers Full-Stack Development when both a frontend and backend framework are present', () => {
    const concepts = inferConceptSkills(new Set(['React', 'Express']));
    expect(concepts).toEqual(
      expect.arrayContaining(['Frontend Development', 'Backend Development', 'Full-Stack Development', 'REST API Design']),
    );
  });

  it('does not infer backend concepts from a frontend-only stack', () => {
    const concepts = inferConceptSkills(new Set(['React']));
    expect(concepts).not.toContain('Backend Development');
    expect(concepts).not.toContain('Full-Stack Development');
  });

  it('returns no concepts for an empty skill set', () => {
    expect(inferConceptSkills(new Set())).toEqual([]);
  });
});

describe('computeTestingScore', () => {
  it('scales with the proportion of test files, capped at 100', () => {
    expect(computeTestingScore(0, 10)).toBe(0);
    expect(computeTestingScore(5, 10)).toBe(100); // 50% test files already saturates the score
    expect(computeTestingScore(3, 30)).toBe(30);
  });
});

describe('computeSecurityScore', () => {
  it('starts at 70 and is penalized per secret found', () => {
    expect(computeSecurityScore(0, false, false)).toBe(70);
    expect(computeSecurityScore(1, false, false)).toBe(50);
    expect(computeSecurityScore(3, false, false)).toBe(10);
  });

  it('rewards env-var usage and a SECURITY.md, clamped to [0, 100]', () => {
    expect(computeSecurityScore(0, true, true)).toBe(100);
    expect(computeSecurityScore(5, false, false)).toBe(0); // floor, never negative
  });
});

describe('computeQualityScore', () => {
  it('sums all signals for a fully-equipped, non-fork repo', () => {
    const score = computeQualityScore({ hasReadme: true, hasLinter: true, hasTypes: true, isFork: false, hasCI: true });
    expect(score).toBe(100);
  });

  it('penalizes forks by withholding the non-fork bonus', () => {
    const score = computeQualityScore({ hasReadme: true, hasLinter: true, hasTypes: true, isFork: true, hasCI: true });
    expect(score).toBe(80);
  });

  it('returns 0 for a repo with none of the quality signals', () => {
    const score = computeQualityScore({ hasReadme: false, hasLinter: false, hasTypes: false, isFork: true, hasCI: false });
    expect(score).toBe(0);
  });
});

describe('computeComplexityScore', () => {
  it('grows logarithmically with file count and language count', () => {
    const small = computeComplexityScore(5, 1);
    const large = computeComplexityScore(500, 4);
    expect(large).toBeGreaterThan(small);
    expect(large).toBeLessThanOrEqual(100);
  });
});

describe('computeMaturityScore', () => {
  it('averages the four component scores', () => {
    expect(computeMaturityScore(100, 100, 100, 100)).toBe(100);
    expect(computeMaturityScore(0, 0, 0, 0)).toBe(0);
    expect(computeMaturityScore(80, 60, 40, 20)).toBe(50);
  });
});
