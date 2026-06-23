interface Props {
  priority: number;
  size?: "sm" | "md" | "lg";
}

const COLORS: Record<number, string> = {
  1: "bg-red-500",
  2: "bg-orange-500",
  3: "bg-amber-400",
  4: "bg-green-500",
  5: "bg-gray-400",
};

const LABELS: Record<number, string> = {
  1: "Kritická",
  2: "Urgentní",
  3: "Středně urgentní",
  4: "Méně urgentní",
  5: "Neurgentní",
};

const SIZES = {
  sm: "w-5 h-5 text-xs",
  md: "w-7 h-7 text-sm",
  lg: "w-9 h-9 text-base",
};

export function PriorityBadge({ priority, size = "md" }: Props) {
  const color = COLORS[priority] ?? "bg-gray-300";
  const sizeClass = SIZES[size];
  return (
    <span
      className={`${color} ${sizeClass} rounded-full flex items-center justify-center text-white font-bold shrink-0`}
      title={LABELS[priority]}
    >
      {priority}
    </span>
  );
}

export function PriorityLabel({ priority }: { priority: number }) {
  return <span className="text-sm text-gray-500">{LABELS[priority] ?? "?"}</span>;
}

export function priorityBg(p: number) {
  const map: Record<number, string> = {
    1: "bg-red-50 border-red-200",
    2: "bg-orange-50 border-orange-200",
    3: "bg-amber-50 border-amber-200",
    4: "bg-green-50 border-green-200",
    5: "bg-gray-50 border-gray-200",
  };
  return map[p] ?? "bg-gray-50 border-gray-200";
}
