import { useRef, PropsWithChildren, Dispatch, SetStateAction } from "react";
import {useToggleState} from 'react-stately';
import {AriaSwitchProps, useFocusRing, useSwitch, VisuallyHidden} from 'react-aria';

const Switch = (props: PropsWithChildren<AriaSwitchProps>) => {
    let state = useToggleState(props);
    const ref = useRef<HTMLInputElement>(null);
    let { inputProps } = useSwitch(props, state, ref);
    let { isFocusVisible, focusProps } = useFocusRing();

    return (
        <label className={`flex items-center ${ props.isDisabled ?  'opacity-40' : 'opacity-100'}`}>
            <VisuallyHidden>
                <input {...inputProps} {...focusProps} ref={ref} />
            </VisuallyHidden>
            <svg
                className='w-10 h-6 mr-1'
                aria-hidden="true"
            >
                <rect
                    className={`w-8 h-4 ${state.isSelected ? 'fill-orange-500' : 'fill-gray-400'}`}
                    x={4}
                    y={4}
                    rx={8}
                />
                <circle
                    className={`fill-white `}
                    cx={state.isSelected ? 28 : 12}
                    cy={12}
                    r={5}
                />
                {isFocusVisible &&
                    (
                        <rect
                            className="h-5.5 w-9.5 fill-none stroke-2 stroke-orange-500"
                            x={1}
                            y={1}
                            rx={11}
                        />
                    )}
            </svg>
            {props.children}
        </label>
    );
}

export default Switch;