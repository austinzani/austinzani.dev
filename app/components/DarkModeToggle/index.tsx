import React from "react";
import {useToggleState} from 'react-stately';
import {AriaSwitchProps, useFocusRing, useSwitch, VisuallyHidden} from 'react-aria';
import Icon from "~/components/Icon";
import {Theme, useTheme} from "~/utils/Theme/theme_provider";

const Toggle = (props: AriaSwitchProps) => {
    const [theme, setTheme] = useTheme();

    const toggleTheme = () => {
        setTheme((prevTheme) => (prevTheme === Theme.LIGHT ? Theme.DARK : Theme.LIGHT));
    };
    let state = useToggleState(props);
    let ref = React.useRef(null);
    let { inputProps } = useSwitch(props, state, ref);
    let { isFocusVisible, focusProps } = useFocusRing();

    return (
        <label
            className={`relative inline-block w-12 h-6 rounded-full transition-colors ${
                Theme.DARK === theme ? "bg-gray-300" : "bg-yellow-400"
            }`}
        >
            <VisuallyHidden>
                <input {...inputProps} {...focusProps} onChange={toggleTheme} ref={ref} />
            </VisuallyHidden>
            <span
                className={`absolute text-center top-0 left-0 inline-block w-6 h-6 transform rounded-full transition-transform ${
                    Theme.DARK === theme ? "translate-x-full" : ""
                } ${isFocusVisible ? `ring-2 ${Theme.DARK === theme ? "ring-gray-300" : "ring-yellow-400"}` : ""}`}
            >
        <Icon
            name={Theme.DARK === theme ? "moon" : "sun"}
            className="text-gray-700"
        />
      </span>
        </label>
    );
};

export default Toggle;
