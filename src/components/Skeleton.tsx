export function SkeletonCard() {
  return (
    <div className="bg-gray-200 rounded-xl h-48 animate-pulse" />
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="bg-gray-200 rounded h-4 animate-pulse" style={{
          width: i === lines - 1 ? '80%' : '100%'
        }} />
      ))}
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm space-y-3">
      <div className="bg-gray-200 rounded h-4 w-24 animate-pulse" />
      <div className="bg-gray-200 rounded h-8 w-32 animate-pulse" />
    </div>
  );
}
