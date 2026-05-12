export interface ConfidenceOption {
  value: number;
  label: string;
  description: string;
}

interface ConfidenceControlProps {
  label: string;
  value: number;
  options: ConfidenceOption[];
  onChange: (value: number) => void;
}

export default function ConfidenceControl({
  label,
  value,
  options,
  onChange,
}: ConfidenceControlProps) {
  const activeOption = options.find((option) => option.value === value) ?? options[0];

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-950">{label}</div>
          <p className="mt-1 text-sm leading-6 text-slate-500">{activeOption.description}</p>
        </div>
        <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-950 shadow-sm">
          {activeOption.value}%
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
              option.value === value
                ? 'border-slate-950 bg-slate-950 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
