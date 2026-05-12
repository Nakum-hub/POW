import { Check, Github, ShieldCheck } from 'lucide-react';
import { useToast } from '../components/Toast';
import { useAuth } from '../contexts/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { toErrorMessage } from '../lib/errors';

export default function Login() {
  useDocumentTitle('SkillOS - Login');

  const { mode, signInWithGitHub } = useAuth();
  const { addToast } = useToast();

  const handleGitHubLogin = async () => {
    try {
      await signInWithGitHub();
    } catch (error) {
      addToast(toErrorMessage(error, 'Unable to start sign-in.'), 'error');
    }
  };

  const proofPoints =
    mode === 'demo'
      ? [
          'Recruiter search, pipeline, billing, and profile workflows available',
          'Candidate briefs and shortlists are ready for stakeholder review',
          'Production backend can be connected without changing the workflow',
        ]
      : ['Read-only repository access', 'No source code is stored', 'Access can be revoked from GitHub anytime'];

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--app-bg)] px-5 py-10">
      <div className="w-full max-w-[460px]">
        <div className="mb-8 text-center">
          <div className="mb-5 inline-flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="text-left">
              <div className="text-xl font-semibold text-slate-950">SkillOS</div>
              <div className="text-xs text-slate-500">Verified hiring workspace</div>
            </div>
          </div>
          <h1 className="text-3xl font-semibold leading-tight text-slate-950">Sign in to your recruiting workspace</h1>
          <p className="mx-auto mt-3 max-w-[360px] text-sm leading-6 text-slate-600">
            Review verified engineering evidence, manage shortlists, and move candidates through a defensible hiring
            workflow.
          </p>
        </div>

        <div className="surface p-6 sm:p-7">
          <button onClick={handleGitHubLogin} className="btn-primary w-full py-3">
            <Github className="h-5 w-5" />
            {mode === 'demo' ? 'Enter workspace' : 'Continue with GitHub'}
          </button>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-semibold text-slate-500">Secure workspace</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="space-y-3">
            {proofPoints.map((text) => (
              <div key={text} className="flex items-start gap-3 text-sm leading-6 text-slate-600">
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-slate-500">
          By continuing, you agree to the Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
