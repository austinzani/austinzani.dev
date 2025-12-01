import { useRef, useState, useEffect } from "react";
import {AriaTabListOptions, AriaTabPanelProps, useFocusRing, useTab, useTabList, useTabPanel, mergeProps} from 'react-aria';
import {Node, TabListState, useTabListState} from 'react-stately';

interface TabsProps extends AriaTabListOptions<object> {
    tabListClassName?: string,
}

export const Tabs = (props: TabsProps) => {
    let state = useTabListState(props);
    let ref = useRef(null);
    let tabContainerRef = useRef(null);
    let { tabListProps } = useTabList(props, state, ref);
    let [activeTabStyle, setActiveTabStyle] = useState({
        width: 0,
        transform: "translateX(0)"
    });
    let [showRightScroll, setShowRightScroll] = useState(false);
    let [showLeftScroll, setShowLeftScroll] = useState(false);

    useEffect(() => {
        let activeTab = ref.current?.querySelector(
            '[role="tab"][aria-selected="true"]'
        );
        let tabContainer = tabContainerRef.current;
        setActiveTabStyle({
            width: activeTab?.offsetWidth,
            transform: `translateX(${activeTab?.offsetLeft}px)`
        });
        
        if (tabContainer) {
            const { scrollLeft, scrollWidth, clientWidth } = tabContainer;
            setShowLeftScroll(scrollLeft > 0);
            setShowRightScroll(scrollLeft < scrollWidth - clientWidth - 1);
        }
    }, [state.selectedKey]);

    let { focusProps, isFocusVisible } = useFocusRing({
        within: true
    });

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollLeft, scrollWidth, clientWidth } = e.currentTarget;
        setShowLeftScroll(scrollLeft > 0);
        setShowRightScroll(scrollLeft < scrollWidth - clientWidth - 1);
    };

    return (
        <div className="w-full">
            <div className="relative">
                {showLeftScroll && (
                    <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white dark:from-black to-transparent z-10" />
                )}
                {showRightScroll && (
                    <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-black to-transparent z-10" />
                )}
                <div 
                    ref={tabContainerRef}
                    onScroll={handleScroll}
                    className={`relative py-1.5 px-1.5 z-0 overflow-x-auto no-scrollbar scroll-smooth ${props.tabListClassName}`}
                >
                    <div {...mergeProps(tabListProps, focusProps)} ref={ref} className="inline-flex">
                        {[...state.collection].map((item) => (
                            <Tab key={item.key} item={item} state={state} />
                        ))}
                    </div>
                </div>
            </div>
            <TabPanel key={state.selectedItem?.key} state={state} />
        </div>
    );
}

const Tab = ({ item, state }: {item: Node<object>, state: TabListState<any>}) => {
    let { key, rendered } = item;
    let ref = useRef(null);
    let { tabProps } = useTab({ key }, state, ref);
    return (
        <div 
            {...tabProps} 
            ref={ref} 
            className={`relative px-4 py-1.5 text-sm font-medium cursor-default outline-none rounded-md transition-colors duration-200 
                ${tabProps["aria-selected"] 
                    ? 'text-orange-600 dark:text-orange-500 bg-orange-50 dark:bg-orange-500/10 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-orange-500' 
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-orange-600 dark:hover:text-orange-500 bg-gray-100/50 dark:bg-zinc-800/50'}`}
        >
            {rendered}
        </div>
    );
}

const TabPanel = ({ state, ...props }: AriaTabPanelProps & {state: TabListState<any>}) => {
    let ref = useRef(null);
    let { tabPanelProps } = useTabPanel(props, state, ref);
    return (
        <div {...tabPanelProps} ref={ref} className="mt-4">
            {state.selectedItem?.props.children}
        </div>
    );
}