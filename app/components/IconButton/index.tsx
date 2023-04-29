import { AriaButtonProps } from "@react-types/button";
import React, {forwardRef, RefObject} from "react";
import { useButton, useFocusRing, mergeProps } from "react-aria";

interface ButtonProps extends AriaButtonProps {
    isPressed: boolean;
}

// @ts-ignore
export const Button = forwardRef((props: ButtonProps, ref: RefObject<HTMLButtonElement>) => {
        let { buttonProps, isPressed } = useButton(props, ref);
        let { focusProps, isFocusVisible } = useFocusRing();

        let focus = isFocusVisible ? "ring ring-offset-2 ring-orange-400" : "";

        return (
            <button
                {...mergeProps(buttonProps, focusProps)}
                ref={ref}
                className={`${focus} text-sm font-semibold py-2 px-4 rounded cursor-default focus:outline-none transition bg-transparent`}
            >
                {props.children}
            </button>
        );
    }
);
