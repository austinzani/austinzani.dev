import { useRef, useState, useEffect } from 'react';

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
                className="flex w-full gap-2.5 overflow-x-auto no-scrollbar"
                onScroll={checkScroll}
            >
                {items.map((item) => (
                    <button
                        key={item.key}
                        onClick={() => onSelectionChange(item.key)}
                        className={`whitespace-nowrap rounded-full border-[1.5px] px-4 py-2.5 font-mono text-[12px] font-semibold uppercase tracking-[0.05em] transition-colors
                            ${selectedKey === item.key 
                                ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-black' 
                                : 'border-zinc-300 bg-zinc-100 text-zinc-600 hover:border-zinc-500 hover:text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-zinc-50'
                            }`}
                    >
                        {item.value}
                    </button>
                ))}
            </div>
        </div>
    );
}
