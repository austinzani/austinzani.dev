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

    useEffect(() => { //@ts-ignore
        let activeTab = ref.current.querySelector(
            '[role="tab"][aria-selected="true"]'
        );
        let tabContainer = tabContainerRef.current;
        setActiveTabStyle({
            width: activeTab?.offsetWidth,
            transform: `translateX(${activeTab?.offsetLeft}px)`
        });
        const childOffset = activeTab?.offsetLeft; // @ts-ignore
        const containerWidth = tabContainer?.offsetWidth;
        const childWidth = activeTab?.offsetWidth;
        console.log(childOffset - (containerWidth - childWidth) / 2, tabContainer)

        // @ts-ignore
        tabContainer.scrollLeft = childOffset - (containerWidth - childWidth) / 2;
    }, [state.selectedKey]);

    let { focusProps, isFocusVisible } = useFocusRing({
        within: true
    });

    const afterStyle = "after:absolute after:top-[-4px] after:left-[-4px] after:right-[-4px] after:bottom-[-4px] after:border-2 after:border-orange-500 after:rounded-full after:z-3"

    return (
        <div>
            <div ref={tabContainerRef} className={`inline-block relative border-2 border-lightgray py-1 px-1 rounded-full z-0 max-w-full overflow-x-auto no-scrollbar scroll-smooth ${props.tabListClassName}`}>
                <div
                    className={`absolute top-1 bottom-1 left-0 rounded-full bg-orange-500 transform will-change-[transform,width] transition-transform transition-width duration-100 -z-10 ${isFocusVisible ? afterStyle : ""}`}
                    style={activeTabStyle}
                />
                <div {...mergeProps(tabListProps, focusProps)} ref={ref} className={`inline-flex`}>
                    {[...state.collection].map((item) => (
                        <Tab key={item.key} item={item} state={state} />
                    ))}
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
        <div {...tabProps} ref={ref} className={`px-8 py-2 text-sm font-semibold cursor-default outline-none rounded-full transition-color duration-150 ${tabProps["aria-selected"] ? 'text-white' : ''}`}>
            {rendered}
        </div>
    );
}

const TabPanel = ({ state, ...props }: AriaTabPanelProps & {state: TabListState<any>}) => {
    let ref = useRef(null);
    let { tabPanelProps } = useTabPanel(props, state, ref);
    return (
        <div {...tabPanelProps} ref={ref}>
            {state.selectedItem?.props.children}
        </div>
    );
}