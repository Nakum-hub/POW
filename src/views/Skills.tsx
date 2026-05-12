import { useCallback, useEffect, useRef, useState } from 'react';
import { Brain } from 'lucide-react';
import ConfidenceControl, { type ConfidenceOption } from '../components/ConfidenceControl';
import { useAuth } from '../contexts/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { fetchSkillEvidence, fetchUserSkills } from '../services/api';
import { SkillCategory, UserSkill } from '../types';
import { skillCategoryMeta } from '../lib/skills';

type CategoryFilter = 'all' | SkillCategory;

interface SkillNode {
  id: string;
  name: string;
  confidence: number;
  category: SkillCategory;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  repoIds: string[];
}

interface GraphTooltip {
  x: number;
  y: number;
  node: SkillNode;
}

interface GraphEdge {
  source: string;
  target: string;
}

const thresholdOptions: ConfidenceOption[] = [
  { value: 0, label: 'All', description: 'Show every detected skill, including early signals.' },
  { value: 40, label: 'Emerging', description: 'Hide weak noise and keep developing strengths visible.' },
  { value: 60, label: 'Proven', description: 'Focus on skills backed by meaningful repository evidence.' },
  { value: 75, label: 'Strong', description: 'Highlight the skills most worth sharing with buyers and recruiters.' },
  { value: 90, label: 'Top', description: 'Only show the strongest verified skills.' },
];

export default function Skills() {
  useDocumentTitle('SkillOS - Skill Graph');

  const { profile } = useAuth();
  const [skills, setSkills] = useState<UserSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [threshold, setThreshold] = useState(40);
  const [viewMode, setViewMode] = useState<'cards' | 'graph'>('cards');
  const [selectedNode, setSelectedNode] = useState<SkillNode | null>(null);
  const [expandedSkillId, setExpandedSkillId] = useState<string | null>(null);
  const [skillEvidenceById, setSkillEvidenceById] = useState<Record<string, NonNullable<UserSkill['evidence']>>>({});
  const [loadingEvidenceById, setLoadingEvidenceById] = useState<Record<string, boolean>>({});

  const loadSkills = useCallback(async () => {
    if (!profile) return;
    try {
      const data = await fetchUserSkills(profile.id);
      setSkills(data);
    } catch (error) {
      console.error('Error loading skills:', error);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    if (profile) {
      void loadSkills();
    }
  }, [profile, loadSkills]);

  const filtered = skills.filter((skill) => {
    if (skill.confidence < threshold) return false;
    if (activeCategory !== 'all' && skill.skill?.category !== activeCategory) return false;
    return true;
  });

  const handleSkillCardClick = useCallback(
    async (skill: UserSkill) => {
      const nextExpandedSkillId = expandedSkillId === skill.id ? null : skill.id;
      setExpandedSkillId(nextExpandedSkillId);

      if (nextExpandedSkillId !== skill.id || skillEvidenceById[skill.id]) {
        return;
      }

      setLoadingEvidenceById((current) => ({ ...current, [skill.id]: true }));

      try {
        const evidence = await fetchSkillEvidence(skill.id);
        setSkillEvidenceById((current) => ({ ...current, [skill.id]: evidence }));
      } catch (error) {
        console.error('Error loading skill evidence:', error);
        setSkillEvidenceById((current) => ({ ...current, [skill.id]: skill.evidence || [] }));
      } finally {
        setLoadingEvidenceById((current) => ({ ...current, [skill.id]: false }));
      }
    },
    [expandedSkillId, skillEvidenceById]
  );

  const categories: { label: string; value: CategoryFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Languages', value: 'language' },
    { label: 'Frameworks', value: 'framework' },
    { label: 'Concepts', value: 'concept' },
    { label: 'DevOps', value: 'devops' },
    { label: 'Databases', value: 'database' },
    { label: 'Practices', value: 'practice' },
  ];

  function getBadgeClasses(category?: SkillCategory) {
    return category ? skillCategoryMeta[category].badgeClass : 'bg-gray-50 text-gray-700 border-gray-200';
  }

  function getConfidenceColor(confidence: number) {
    if (confidence >= 70) return 'text-emerald-600';
    if (confidence >= 40) return 'text-amber-600';
    return 'text-red-500';
  }

  if (loading) {
    return (
      <div className="workspace-page">
        <div className="mb-8 space-y-3">
          <div className="h-8 w-44 rounded bg-gray-200 animate-pulse" />
          <div className="h-4 w-72 rounded bg-gray-200 animate-pulse" />
        </div>
        <div className="surface animate-pulse p-6">
          <div className="mb-5 h-24 rounded-2xl bg-gray-200" />
          <div className="h-96 rounded-2xl bg-gray-200" />
        </div>
      </div>
    );
  }

  if (!filtered.length && !skills.length) {
    return (
      <div className="workspace-page">
        <div className="mb-7">
          <h1 className="mb-1 text-2xl font-semibold text-gray-900">Skill Graph</h1>
          <p className="text-sm text-gray-600">Explore the skills detected from your repositories.</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50">
            <Brain className="h-7 w-7 text-blue-600" />
          </div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">No skills detected yet</h2>
          <p className="mx-auto mb-6 max-w-md text-gray-600">
            Analyze your repositories to detect your technical skills and build your skill profile.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="workspace-page">
      <div className="mb-7">
        <div className="page-kicker">Evidence</div>
        <h1 className="mt-2 page-title">Skill Graph</h1>
        <p className="text-sm text-gray-600">Explore the skills detected from your repositories.</p>
      </div>

      <div className="surface mb-7 p-5">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Category Filter</h3>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category.value}
                  onClick={() => setActiveCategory(category.value)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                    activeCategory === category.value
                      ? 'bg-slate-950 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('cards')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                viewMode === 'cards' ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode('graph')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                viewMode === 'graph' ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Graph
            </button>
          </div>
        </div>

        <ConfidenceControl
          label="Confidence threshold"
          value={threshold}
          options={thresholdOptions}
          onChange={setThreshold}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="surface border-dashed px-8 py-16 text-center">
          <h2 className="text-xl font-semibold text-gray-900">No skills match the current filter.</h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Lower the confidence threshold or switch categories to see more detected skills.
          </p>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((skill) => {
            const isExpanded = expandedSkillId === skill.id;
            const evidence = skillEvidenceById[skill.id] || skill.evidence || [];

            return (
              <div
                key={skill.id}
                onClick={() => void handleSkillCardClick(skill)}
                className="cursor-pointer rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-3 flex items-start justify-between">
                  <span
                    className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${getBadgeClasses(
                      skill.skill?.category
                    )}`}
                  >
                    {skill.skill?.category || 'skill'}
                  </span>
                  <span className={`text-2xl font-extrabold ${getConfidenceColor(skill.confidence)}`}>
                    {skill.confidence}%
                  </span>
                </div>
                <h3 className="mb-3 font-bold text-gray-900">{skill.skill?.name || 'Unknown'}</h3>
                <div className="mb-2 h-2 w-full rounded-full bg-gray-100">
                  <div
                    className="h-2 rounded-full bg-blue-600 transition-all duration-500"
                    style={{ width: `${skill.confidence}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500">Detected in {evidence.length} repositories</p>
                {isExpanded && (
                  <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div className="mb-3 text-xs font-semibold uppercase text-gray-500">Evidence</div>
                    {loadingEvidenceById[skill.id] ? (
                      <p className="text-sm text-gray-500">Loading evidence...</p>
                    ) : evidence.length > 0 ? (
                      <div className="space-y-2">
                        {evidence.map((item, index) => (
                          <div
                            key={`${skill.id}-${item.repo_id || index}`}
                            className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2"
                          >
                            <span className="min-w-0 truncate text-sm font-medium text-gray-900">
                              {item.repo?.name || item.repo_id || 'Repository unavailable'}
                            </span>
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                              {Math.round(Number(item.score || 0) * 100)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No evidence details available</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <SkillGraphCanvas skills={filtered} selectedNode={selectedNode} onSelectNode={setSelectedNode} />
          {selectedNode && (
            <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <h4 className="mb-2 font-semibold text-blue-900">{selectedNode.name}</h4>
              <div className="space-y-1 text-sm text-blue-800">
                <p>Confidence: {selectedNode.confidence}%</p>
                <p>Category: {selectedNode.category}</p>
                <p>Repositories: {selectedNode.repoIds.length}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SkillGraphCanvas({
  skills,
  selectedNode,
  onSelectNode,
}: {
  skills: UserSkill[];
  selectedNode: SkillNode | null;
  onSelectNode: (node: SkillNode | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<SkillNode[]>([]);
  const edgesRef = useRef<GraphEdge[]>([]);
  const animationRef = useRef<number>();
  const selectedNodeRef = useRef<SkillNode | null>(selectedNode);
  const [tooltip, setTooltip] = useState<GraphTooltip | null>(null);

  useEffect(() => {
    selectedNodeRef.current = selectedNode;
  }, [selectedNode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const setupCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    setupCanvas();

    nodesRef.current = skills.map((skill) => ({
      id: skill.id,
      name: skill.skill?.name || 'Unknown',
      confidence: skill.confidence,
      category: skill.skill?.category || 'concept',
      x: canvas.width / 2 + (Math.random() - 0.5) * (canvas.width * 0.5),
      y: canvas.height / 2 + (Math.random() - 0.5) * (canvas.height * 0.5),
      vx: (Math.random() - 0.5) * 1.5,
      vy: (Math.random() - 0.5) * 1.5,
      radius: 8 + (skill.confidence / 100) * 12,
      repoIds: (skill.evidence || [])
        .map((evidence) => evidence.repo_id)
        .filter((repoId): repoId is string => Boolean(repoId)),
    }));

    const repoToSkills = new Map<string, string[]>();
    nodesRef.current.forEach((node) => {
      node.repoIds.forEach((repoId) => {
        const current = repoToSkills.get(repoId) || [];
        current.push(node.id);
        repoToSkills.set(repoId, current);
      });
    });

    const edgeSet = new Set<string>();
    repoToSkills.forEach((skillIds) => {
      for (let i = 0; i < skillIds.length; i += 1) {
        for (let j = i + 1; j < skillIds.length; j += 1) {
          const pair = [skillIds[i], skillIds[j]].sort().join('::');
          edgeSet.add(pair);
        }
      }
    });

    edgesRef.current = Array.from(edgeSet).map((edge) => {
      const [source, target] = edge.split('::');
      return { source, target };
    });

    const simulate = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#f9fafb';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const nodes = nodesRef.current;
      const padding = 40;
      const repulsionDistance = 140;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;

          if (dist < repulsionDistance) {
            const force = -0.25 / (dist * dist);
            nodes[i].vx += (force * dx) / dist;
            nodes[i].vy += (force * dy) / dist;
            nodes[j].vx -= (force * dx) / dist;
            nodes[j].vy -= (force * dy) / dist;
          }
        }
      }

      edgesRef.current.forEach((edge) => {
        const source = nodes.find((node) => node.id === edge.source);
        const target = nodes.find((node) => node.id === edge.target);
        if (!source || !target) return;

        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const desiredDistance = 150;
        const force = (dist - desiredDistance) * 0.0008;

        source.vx += force * dx;
        source.vy += force * dy;
        target.vx -= force * dx;
        target.vy -= force * dy;
      });

      nodes.forEach((node) => {
        node.vx += (centerX - node.x) * 0.0009;
        node.vy += (centerY - node.y) * 0.0009;
        node.x += node.vx * 0.6;
        node.y += node.vy * 0.6;
        node.vx *= 0.92;
        node.vy *= 0.92;

        node.x = Math.max(padding, Math.min(canvas.width - padding, node.x));
        node.y = Math.max(padding, Math.min(canvas.height - padding, node.y));
      });

      ctx.strokeStyle = 'rgba(156, 163, 175, 0.35)';
      ctx.lineWidth = 1;
      edgesRef.current.forEach((edge) => {
        const source = nodes.find((node) => node.id === edge.source);
        const target = nodes.find((node) => node.id === edge.target);
        if (!source || !target) return;
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
      });

      nodes.forEach((node) => {
        ctx.fillStyle = getCategoryColorHex(node.category);
        if (selectedNodeRef.current?.id === node.id) {
          ctx.fillStyle = '#1d4ed8';
        }

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#374151';
        ctx.font = `${Math.max(10, node.radius * 0.8)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (node.radius > 12) {
          ctx.fillText(
            node.name.length > 12 ? `${node.name.substring(0, 10)}...` : node.name,
            node.x,
            node.y + node.radius + 14
          );
        }
      });

      animationRef.current = requestAnimationFrame(simulate);
    };

    simulate();

    const findNodeAtPosition = (x: number, y: number) =>
      nodesRef.current.find((node) => {
        const dx = x - node.x;
        const dy = y - node.y;
        return dx * dx + dy * dy < node.radius * node.radius;
      }) || null;

    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const hovered = findNodeAtPosition(x, y);

      canvas.style.cursor = hovered ? 'pointer' : 'default';

      if (hovered) {
        setTooltip({
          x: x + 16,
          y: y + 16,
          node: hovered,
        });
      } else {
        setTooltip(null);
      }
    };

    const handleMouseLeave = () => {
      setTooltip(null);
      canvas.style.cursor = 'default';
    };

    const handleClick = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const node = findNodeAtPosition(x, y);
      if (!node) {
        onSelectNode(null);
        return;
      }

      onSelectNode(selectedNodeRef.current?.id === node.id ? null : node);
    };

    const handleResize = () => {
      setupCanvas();
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    canvas.addEventListener('click', handleClick);
    window.addEventListener('resize', handleResize);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      canvas.removeEventListener('click', handleClick);
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [skills, onSelectNode]);

  function getCategoryColorHex(category: SkillCategory) {
    switch (category) {
      case 'language':
        return '#3b82f6';
      case 'framework':
        return '#a855f7';
      case 'concept':
        return '#14b8a6';
      case 'devops':
        return '#f97316';
      case 'database':
        return '#22c55e';
      case 'practice':
        return '#f43f5e';
      default:
        return '#6b7280';
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <canvas ref={canvasRef} className="h-96 w-full cursor-pointer rounded-lg border border-gray-200" />
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="font-semibold text-gray-900">{tooltip.node.name}</div>
          <div className="mt-1 text-gray-500">{tooltip.node.confidence}% confidence</div>
        </div>
      )}
    </div>
  );
}
