import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Brain,
  CreditCard,
  FileText,
  GitBranch,
  LayoutDashboard,
  Menu,
  Search,
  Settings as SettingsIcon,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { useRevenue } from '../contexts/RevenueContext';
import { avatarPlaceholder } from '../lib/placeholders';
import { getPlanDefinition } from '../lib/plans';

interface LayoutProps {
  children: ReactNode;
}

const navigationGroups = [
  {
    label: 'Workspace',
    items: [
      { name: 'Overview', path: '/dashboard', icon: LayoutDashboard },
      { name: 'Recruiter Search', path: '/search', icon: Search },
      { name: 'Pipeline', path: '/pipeline', icon: Users },
    ],
  },
  {
    label: 'Evidence',
    items: [
      { name: 'Skill Graph', path: '/skills', icon: Brain },
      { name: 'Repositories', path: '/repos', icon: GitBranch },
      { name: 'Candidate Briefs', path: '/explainer', icon: FileText },
    ],
  },
  {
    label: 'Operations',
    items: [{ name: 'Billing', path: '/billing', icon: CreditCard }],
  },
];

export default function Layout({ children }: LayoutProps) {
  const { profile } = useAuth();
  const { subscription } = useRevenue();
  const { sidebarOpen, setSidebarOpen } = useApp();
  const location = useLocation();
  const currentPlan = getPlanDefinition(subscription?.plan_key || 'starter');

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-slate-950">
      <aside
        className={`fixed left-0 top-0 z-40 flex min-h-screen w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="px-5 pb-4 pt-5">
          <Link to="/dashboard" className="flex items-center gap-3" onClick={() => setSidebarOpen(false)}>
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-base font-semibold text-slate-950">SkillOS</div>
              <div className="text-xs text-slate-500">Verified hiring workspace</div>
            </div>
          </Link>

          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
            <div className="text-xs font-semibold text-slate-500">Workspace plan</div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-slate-950">{currentPlan.name}</div>
              <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${currentPlan.badgeClass}`}>
                {subscription?.status || 'trialing'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-4">
          {navigationGroups.map((group) => (
            <div key={group.label} className="mb-5">
              <div className="mb-2 px-2 text-xs font-semibold text-slate-500">{group.label}</div>
              <nav className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                        isActive
                          ? 'bg-slate-950 text-white shadow-sm'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                      }`}
                    >
                      <Icon className="h-[18px] w-[18px] flex-shrink-0" />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}

          <Link
            to="/settings"
            onClick={() => setSidebarOpen(false)}
            className={`flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
              location.pathname === '/settings'
                ? 'bg-slate-950 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
            }`}
          >
            <SettingsIcon className="h-[18px] w-[18px] flex-shrink-0" />
            <span>Settings</span>
          </Link>
        </div>

        {profile && (
          <div className="border-t border-slate-200 p-3">
            <div className="flex items-center gap-3 rounded-xl px-2 py-2">
              <img
                src={profile.avatar_url || avatarPlaceholder}
                alt={profile.name}
                className="h-9 w-9 flex-shrink-0 rounded-lg object-cover"
              />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-950">{profile.name}</div>
                <div className="truncate text-xs text-slate-500">@{profile.github_id}</div>
              </div>
            </div>
          </div>
        )}
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/35 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="fixed inset-x-0 top-0 z-30 flex h-16 items-center border-b border-slate-200 bg-[var(--app-bg)] px-3.5 lg:hidden">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm"
          aria-label="Toggle navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      <main className="min-h-screen pt-16 lg:ml-64 lg:pt-0">{children}</main>
    </div>
  );
}
