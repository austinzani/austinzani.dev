import one from "../images/memoji_1.png";
import two from "../images/memoji_2.png";
import three from "../images/memoji_3.png";
import four from "../images/memoji_4.png";
import five from "../images/memoji_5.png";
import six from "../images/memoji_6.png";
const memojis = [one, two, three, four, five, six];
import IconButton from "~/components/IconButton";

export default function _index() {
  // Get a random number between 0 and 5
  const random = Math.floor(Math.random() * 6);
  return (
    <div className="w-full h-full flex items-center flex-col">
      <img
        className="w-60 h-60 mt-20 mb-4"
        src={memojis[random]}
        alt="Random MeMoji of the site owner Austin Zani"
      />
      <h1 className="font-['Outfit'] w-fit font-semibold text-4xl">
        Austin Zani
      </h1>
      <h2 className="font-['Outfit'] text-gray-600 dark:text-gray-300 text-center font-normal text-lg sm:text-lg px-4">
        Husband, Father, <br className="sm:hidden" />
        Sports Addict, Software Developer
      </h2>
      <div className="w-fit flex items-center space-x-2 mt-4">
        <IconButton
          link="https://mastodon.social/@zaniad"
          icon="mastodon"
          internal={false}
          iconPrefix="fab"
          label="Mastodon"
        />
        <IconButton
          link="https://github.com/austinzani"
          icon="github"
          internal={false}
          iconPrefix="fab"
          label="Github"
        />
        <IconButton
          link="https://www.linkedin.com/in/zaniad/"
          icon="linkedin"
          internal={false}
          iconPrefix="fab"
          label="LinkedIn"
        />
        <IconButton
          link="mailto:austinzani@gmail.com"
          icon="envelope"
          internal={false}
          label="Email"
        />
      </div>
    </div>
  );
}
