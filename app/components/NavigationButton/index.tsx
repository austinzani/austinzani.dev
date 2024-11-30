import React from 'react';
import { Link } from '@remix-run/react';
import { IconName, IconPrefix } from '@fortawesome/fontawesome-svg-core';
import Icon from '../Icon';

export interface NavigationButtonProps {
  link: string;
  icon: IconName;
  iconPrefix?: IconPrefix;
  internal?: boolean;
  label?: string;
}

const NavigationButton = ({
  link,
  icon,
  internal,
  iconPrefix,
  label
}: NavigationButtonProps) => {
  const baseStyles = `
    relative
    flex items-center justify-center
    w-10 h-10
    rounded-lg
    transition-all duration-200
    focus:outline-none
    text-black dark:text-gray-200
    hover:bg-orange-500 hover:text-white
    active:scale-95
    group
  `;

  const iconWrapperStyles = `
    flex items-center justify-center
    w-5 h-5
    transform transition-transform duration-200
    group-hover:scale-110
  `;

  const tooltipStyles = `
    absolute top-full mt-2
    px-2 py-1
    bg-gray-800 dark:bg-zinc-800
    text-white
    text-sm rounded
    opacity-0 group-hover:opacity-100
    transition-opacity duration-200
    pointer-events-none
    whitespace-nowrap
  `;

  const shadowStyles = `
    before:absolute before:inset-0
    before:rounded-lg
    before:transition-all before:duration-200
    before:opacity-0
    hover:before:opacity-100
    before:shadow-lg
  `;

  const content = (
    <>
      <div className={iconWrapperStyles}>
        <Icon name={icon} prefix={iconPrefix} className="w-5 h-5" />
      </div>
      {label && <span className={tooltipStyles}>{label}</span>}
    </>
  );

  const combinedStyles = `${baseStyles} ${shadowStyles}`;

  if (internal) {
    return (
      <Link to={link} prefetch="intent" className={combinedStyles}>
        {content}
      </Link>
    );
  }

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className={combinedStyles}
    >
      {content}
    </a>
  );
};

export default NavigationButton;