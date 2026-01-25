interface SuitedSilhouettesProps {
  variant?: "default" | "minimal" | "corner";
}

export function SuitedSilhouettes({ variant = "default" }: SuitedSilhouettesProps) {
  if (variant === "corner") {
    return (
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <svg
          className="absolute bottom-0 right-0 w-48 h-64 md:w-64 md:h-80 opacity-[0.03] dark:opacity-[0.05]"
          viewBox="0 0 200 280"
          fill="currentColor"
        >
          <path d="M100 0 C100 0 70 20 70 50 L70 80 L60 90 L60 120 L50 130 L50 200 L60 210 L60 280 L80 280 L80 220 L90 210 L90 180 L110 180 L110 210 L120 220 L120 280 L140 280 L140 210 L150 200 L150 130 L140 120 L140 90 L130 80 L130 50 C130 20 100 0 100 0" />
          <ellipse cx="100" cy="25" rx="25" ry="30" />
          <path d="M70 90 L60 100 L65 110 L75 105 L80 95 L70 90" />
          <path d="M130 90 L140 100 L135 110 L125 105 L120 95 L130 90" />
          <rect x="95" y="95" width="10" height="85" rx="2" />
          <path d="M85 100 L100 115 L100 180 L95 180 L85 110 Z" />
          <path d="M115 100 L100 115 L100 180 L105 180 L115 110 Z" />
        </svg>
      </div>
    );
  }

  if (variant === "minimal") {
    return (
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <svg
          className="absolute top-20 left-4 w-20 h-28 md:w-24 md:h-32 opacity-[0.02] dark:opacity-[0.04] rotate-[-10deg]"
          viewBox="0 0 100 140"
          fill="currentColor"
        >
          <ellipse cx="50" cy="20" rx="15" ry="18" />
          <path d="M35 35 L30 50 L30 90 L35 95 L35 140 L45 140 L45 100 L50 95 L55 100 L55 140 L65 140 L65 95 L70 90 L70 50 L65 35 Z" />
          <path d="M42 55 L50 70 L58 55 L50 50 Z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
      <svg
        className="absolute top-32 left-[-20px] w-32 h-44 md:w-40 md:h-56 opacity-[0.02] dark:opacity-[0.04] rotate-[-5deg]"
        viewBox="0 0 160 220"
        fill="currentColor"
      >
        <ellipse cx="80" cy="28" rx="22" ry="26" />
        <path d="M58 50 L48 70 L48 140 L55 148 L55 220 L75 220 L75 155 L80 150 L85 155 L85 220 L105 220 L105 148 L112 140 L112 70 L102 50 Z" />
        <path d="M48 70 L38 85 L45 95 L55 88 L58 75 Z" />
        <path d="M112 70 L122 85 L115 95 L105 88 L102 75 Z" />
        <path d="M68 75 L80 95 L92 75 L80 68 Z" />
        <rect x="77" y="95" width="6" height="55" rx="1" />
      </svg>

      <svg
        className="absolute bottom-20 right-[-10px] w-36 h-48 md:w-44 md:h-60 opacity-[0.02] dark:opacity-[0.04] rotate-[8deg]"
        viewBox="0 0 180 240"
        fill="currentColor"
      >
        <ellipse cx="90" cy="28" rx="24" ry="28" />
        <path d="M66 52 L54 75 L50 85 L50 155 L58 165 L58 240 L80 240 L80 175 L90 165 L100 175 L100 240 L122 240 L122 165 L130 155 L130 85 L126 75 L114 52 Z" />
        <path d="M54 75 L40 95 L50 110 L62 100 L66 80 Z" />
        <path d="M126 75 L140 95 L130 110 L118 100 L114 80 Z" />
        <path d="M75 85 L90 115 L105 85 L90 75 Z" />
        <rect x="87" y="115" width="6" height="50" rx="1" />
        <path d="M70 160 L90 180 L110 160" fill="none" stroke="currentColor" strokeWidth="3" />
      </svg>

      <svg
        className="absolute top-1/2 left-2 w-16 h-22 md:w-20 md:h-28 opacity-[0.015] dark:opacity-[0.03] -translate-y-1/2"
        viewBox="0 0 80 110"
        fill="currentColor"
      >
        <ellipse cx="40" cy="14" rx="12" ry="14" />
        <path d="M28 26 L22 40 L22 70 L26 75 L26 110 L36 110 L36 80 L40 76 L44 80 L44 110 L54 110 L54 75 L58 70 L58 40 L52 26 Z" />
        <path d="M35 40 L40 50 L45 40 L40 36 Z" />
      </svg>
    </div>
  );
}
