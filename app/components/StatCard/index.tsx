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
    <div className="flex flex-col items-center p-3 rounded-lg bg-gray-50 dark:bg-zinc-800">
        <div className="text-sm text-gray-600 dark:text-gray-400">{title}</div>
        <div className="text-xl font-medium mt-1 truncate w-full text-center">{value}</div>
        {subtitle && <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">{subtitle}</div>}
    </div>
);

export default StatCard;