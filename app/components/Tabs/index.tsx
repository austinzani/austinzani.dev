import { useRef } from "react";
import {AriaTabListOptions, AriaTabPanelProps, useTab, useTabList, useTabPanel} from 'react-aria';
import {Node, TabListState, useTabListState} from 'react-stately';

export const Tabs = (props: AriaTabListOptions<object>) => {
    let state = useTabListState(props);
    let ref = useRef(null);
    let { tabListProps } = useTabList(props, state, ref);
    return (
        <div className={``}>
            <div {...tabListProps} ref={ref} className={'flex '}>
                {[...state.collection].map((item) => (
                    <Tab key={item.key} item={item} state={state} />
                ))}
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
        <div {...tabProps} ref={ref} className={`py-2 px-4 no ${state.selectedKey === key && "border-b-2 border-b-orange-400 bg-gray-100 rounded-t-xl"}`}>
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