import React, { useId } from 'react';

interface TooltipProps {
  text: string;
  position?: 'top' | 'bottom';
}

export function Tooltip({ text, position = 'top' }: TooltipProps): React.ReactElement {
  const tooltipId = useId();
  const bubbleClass = position === 'top'
    ? 'bottom-full mb-1'
    : 'top-full mt-1';

  return (
    <span className="relative group inline-flex items-center">
      <button
        type="button"
        className="text-[11px] text-[#00000099] cursor-default select-none leading-none bg-transparent border-0 p-0"
        aria-describedby={tooltipId}
        aria-label="Information"
      >
        ⓘ
      </button>
      <span
        id={tooltipId}
        className={[
          'pointer-events-none absolute left-1/2 -translate-x-1/2 z-50',
          bubbleClass,
          'w-max max-w-[200px]',
          'bg-white rounded-lg px-3 py-2',
          'text-[12px] text-[#000000E6] leading-snug',
          'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150',
        ].join(' ')}
        style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.15), 0 2px 3px rgba(0,0,0,0.2)' }}
        role="tooltip"
      >
        {text}
      </span>
    </span>
  );
}
