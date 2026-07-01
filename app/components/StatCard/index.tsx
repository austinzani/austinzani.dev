import React from 'react';

interface StatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
}

const StatCard = ({
    title,
    value,
    subtitle
}: StatCardProps) => (
    <div className="flex flex-col items-center border border-dashed border-line-muted bg-surface p-3">
        <div className="font-mono text-xs uppercase tracking-wide text-ink-muted">{title}</div>
        <div className="mt-1 w-full truncate text-center font-display text-3xl italic">{value}</div>
        {subtitle && <div className="mt-1 text-xs text-ink-muted">{subtitle}</div>}
    </div>
);

export default StatCard;
