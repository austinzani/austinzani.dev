import { Link } from "@remix-run/react";
import Icon from "../Icon";
import { Theme, useTheme } from "~/utils/theme-provider";
import NavigationButton from "../NavigationButton";

const iconTransformOrigin = { transformOrigin: "50% 100px" };
const DarkModeToggle = () => {
  const [, setTheme] = useTheme();
  return (
    <button
      onClick={() => {
        setTheme((previousTheme) =>
          previousTheme === Theme.DARK ? Theme.LIGHT : Theme.DARK
        );
      }}
      className={`border-secondary hover:border-primary focus:border-primary inline-flex h-10 items-center justify-center overflow-hidden rounded-full border-2 p-1 transition focus:outline-none w-10`}
    >
      {/* note that the duration is longer then the one on body, controlling the bg-color */}
      <div className="relative h-8 w-8">
        <span
          className="absolute inset-0 rotate-90 transform text-black transition duration-500 motion-reduce:duration-[0s] dark:rotate-0 dark:text-white"
          style={iconTransformOrigin}
        >
          <Icon name={"moon"} className={"p-2"} />
        </span>
        <span
          className="absolute inset-0 rotate-0 transform text-black transition duration-500 motion-reduce:duration-[0s] dark:-rotate-90 dark:text-white"
          style={iconTransformOrigin}
        >
          <Icon name={"sun"} className={"p-1 pt-2"} />
        </span>
      </div>
    </button>
  );
};

const NavHeader = () => {
  return (
    <header className="flex justify-between h-14 bg-gray-100 dark:bg-zinc-900 items-center px-4 sticky top-0 z-30 shadow-lg shadow-gray-200/50 dark:shadow-black/30 backdrop-blur-sm">
      <p
        className="font-['Outfit'] text-2xl font-semibold text-orange-600 dark:text-orange-500 
              bg-orange-100 dark:bg-orange-950 
              px-2 py-1.5 rounded-md
              shadow-inner
              border border-orange-200 dark:border-orange-900
              ring-1 ring-inset ring-orange-300/20 dark:ring-orange-500/20"
      >
        AZ
      </p>
      <div className="w-fit flex items-center space-x-2">
        <DarkModeToggle />
        <NavigationButton link="/" icon={"house"} internal={true} label="Home" />
        <NavigationButton
          link="/fantasy_football"
          icon={"football"}
          internal={true}
          label="Fantasy Football"
        />
        <NavigationButton link="/music" icon={"music"} internal={true} label="Music" />
        <NavigationButton link="/about" icon={"user"} internal={true} label="About" />
      </div>
    </header>
  );
};

export default NavHeader;
