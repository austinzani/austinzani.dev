import React, { useRef, useState, useEffect } from 'react';

interface ScrollablePillsProps {
    items: { key: string; value: string }[];
    selectedKey: string;
    onSelectionChange: (key: string) => void;
}

export default function ScrollablePills({ items, selectedKey, onSelectionChange }: ScrollablePillsProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [showLeftScroll, setShowLeftScroll] = useState(false);
    const [showRightScroll, setShowRightScroll] = useState(false);

    const checkScroll = () => {
        if (!scrollRef.current) return;
        
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        setShowLeftScroll(scrollLeft > 0);
        setShowRightScroll(scrollLeft < scrollWidth - clientWidth - 1);
    };

    useEffect(() => {
        checkScroll();
        window.addEventListener('resize', checkScroll);
        return () => window.removeEventListener('resize', checkScroll);
    }, []);

    return (
        <div className="relative mb-4 w-full overflow-hidden">
            {showLeftScroll && (
                <div className="absolute left-0 top-0 bottom-0 flex items-center pointer-events-none z-10">
                    <div className="w-8 h-full bg-gradient-to-r from-paper to-transparent" />
                </div>
            )}
            
            {showRightScroll && (
                <div className="absolute right-0 top-0 bottom-0 flex items-center pointer-events-none z-10">
                    <div className="w-8 h-full bg-gradient-to-l from-paper to-transparent" />
                </div>
            )}
            
            <div 
                ref={scrollRef}
                className="flex gap-2 overflow-x-auto no-scrollbar w-full"
                onScroll={checkScroll}
            >
                {items.map((item) => (
                    <button
                        key={item.key}
                        onClick={() => onSelectionChange(item.key)}
                        className={`rounded-full border border-dashed px-3 py-1 font-mono text-xs uppercase tracking-wide whitespace-nowrap transition-colors
                            ${selectedKey === item.key 
                                ? 'border-accent bg-accent-soft text-ink' 
                                : 'border-line-muted bg-surface text-ink-muted hover:border-accent hover:text-ink'
                            }`}
                    >
                        {item.value}
                    </button>
                ))}
            </div>
        </div>
    );
}
