import React from "react";
import {useBreadcrumbItem, useBreadcrumbs, AriaBreadcrumbItemProps, AriaBreadcrumbsProps} from 'react-aria';
import Icon from "~/components/Icon";
import {Link} from "@remix-run/react";

interface BreadcrumbsProps extends AriaBreadcrumbsProps {
    children: React.ReactElement | React.ReactElement[],
    className?: string
}

export const Breadcrumbs = (props: BreadcrumbsProps) => {
    let { navProps } = useBreadcrumbs(props);
    let childCount = React.Children.count(props.children);

    return (
        <nav {...navProps} className={props.className}>
            <ol className={"flex flex-wrap list-none m-0 p-0"}>
                {React.Children.map(props.children, (child, i) =>
                    React.cloneElement(child, { isCurrent: i === childCount - 1 }))}
            </ol>
        </nav>
    );
}

interface BreadcrumbItemProps extends AriaBreadcrumbItemProps {
    href?: string
}

export const BreadcrumbItem = (props: BreadcrumbItemProps) => {
    let ref = React.useRef(null);
    let { itemProps } = useBreadcrumbItem({
        ...props,
        elementType: props.isCurrent ? 'h3' : 'a'
    }, ref);
    let breadcrumbContent;
    if (props.isCurrent) {
        breadcrumbContent = (
            <h3
                {...itemProps}
                ref={ref}
                className={"m-0 text-base text-orange-500"}
            >
                {props.children}
            </h3>
        );
    } else {
        breadcrumbContent = (
            <>
                <Link
                    {...itemProps}
                    ref={ref}
                    to={props.href ?? ""}
                    prefetch={"intent"}
                    className={`${props.isDisabled ? 'text-gray-700' : 'text-orange-500'}
                    ${props.isCurrent || props.isDisabled ? '' : 'underline cursor-pointer'}
                    ${props.isCurrent ? 'font-bold' : ''}
                    `}
                >
                    {props.children}
                </Link>
                <span aria-hidden="true" className={"py-0 px-1.5 text-orange-500"}><Icon name={"chevron-right"} /></span>
            </>
        );
    }

    return (
        <li>
            {breadcrumbContent}
        </li>
    );
}