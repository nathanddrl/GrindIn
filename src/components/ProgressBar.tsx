interface ProgressBarProps {
  value: number;       // valeur actuelle
  max: number;         // valeur max
  label?: string;
  className?: string;
}

export function ProgressBar({ value, max, label, className = '' }: ProgressBarProps) {
  const percent = max > 0 ? Math.min(100, (value / max) * 100) : 0;

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className="flex justify-between mb-1">
          <span className="text-xs font-semibold text-[#000000E6]">{label}</span>
          <span className="text-xs text-[#00000099]">{Math.round(percent)}%</span>
        </div>
      )}
      <div
        className="w-full h-2 rounded-full overflow-hidden"
        style={{ backgroundColor: 'rgba(0,0,0,0.08)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-200"
          style={{
            width: `${percent}%`,
            backgroundColor: '#0A66C2',
          }}
        />
      </div>
    </div>
  );
}
