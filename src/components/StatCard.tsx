interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  className?: string;
}

export function StatCard({ label, value, sublabel, className = '' }: StatCardProps) {
  return (
    <div
      className={`bg-white rounded-lg p-4 ${className}`}
      style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.15), 0 2px 3px rgba(0,0,0,0.2)' }}
    >
      <p className="text-xs font-semibold text-[#00000099] uppercase tracking-wide">{label}</p>
      <p className="text-xl font-bold text-[#000000E6] mt-1">{value}</p>
      {sublabel && <p className="text-xs text-[#00000099] mt-0.5">{sublabel}</p>}
    </div>
  );
}
