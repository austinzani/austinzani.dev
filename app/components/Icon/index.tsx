import type {IconName, IconPrefix} from '@fortawesome/fontawesome-svg-core';
import { icon, library } from '@fortawesome/fontawesome-svg-core';
import { faFootball, faHouse, faMusic, faUser, faChevronLeft, faChevronRight, faEnvelope, faFootballBall, faSun, faMoon } from '@fortawesome/free-solid-svg-icons';
import { faMastodon, faLinkedin, faGithub } from '@fortawesome/free-brands-svg-icons';

library.add(
    faFootball,
    faHouse,
    faMusic,
    faUser,
    faMastodon,
    faLinkedin,
    faGithub,
    faChevronLeft,
    faChevronRight,
    faEnvelope,
    faFootballBall,
    faSun,
    faMoon
);


type Props = {
    name: IconName,
    prefix?: IconPrefix,
    spin?: boolean,
    bounce?: boolean,
    className?: string,
};

const Icon = ({ name, prefix = 'fas', spin, bounce, className }: Props) => {
    const classes = [];

    if(spin) {
        classes.push('fa-spin');
    }

    if(bounce) {
        classes.push('fa-bounce');
    }

    if(className) {
        classes.push(className);
    }

    const iconHTML = icon({ iconName: name, prefix }, { classes, })?.html;

    return (
        <span dangerouslySetInnerHTML={{ __html: iconHTML[0] }} />
    );
};

export default Icon;