import one from '../images/memoji_1.png'
import two from '../images/memoji_2.png'
import three from '../images/memoji_3.png'
import four from '../images/memoji_4.png'
import five from '../images/memoji_5.png'
import six from '../images/memoji_6.png'
const memojis = [one, two, three, four, five, six]

import Icon from "~/components/Icon";
import {Link} from "@remix-run/react";

export default function Index() {
    // Get a random number between 0 and 5
    const random = Math.floor(Math.random() * 6);
  return (
      <div className="w-full h-full flex items-center flex-col">
        <img className={"w-60 h-60 mt-20 mb-4"} src={memojis[random]} alt={"Random MeMoji of the site owner Austin Zani"}/>
        <h1 className="font-['Outfit'] w-fit font-medium text-4xl">Austin Zani</h1>
        <h2 className="font-['Outfit'] text-gray-400 w-fit font-light text-l">Husband, Father, Sports Addict, Software Developer</h2>
        <div className="flex flex-row mt-4">
            <a target="_blank" rel="noopener noreferrer" href={"https://mastodon.social/@zaniad"} className={"h-10 text-2xl w-10 p-2.5 mx-1 flex items-center justify-center hover:bg-orange-500/60 border-black border hover:cursor-pointer rounded-md"}>
                <Icon name={'mastodon'} prefix={"fab"}/>
            </a>
            <a target="_blank" rel="noopener noreferrer" href={"https://github.com/austinzani"} className={"h-10 text-2xl w-10 p-2.5 mx-1 flex items-center justify-center hover:bg-orange-500/60 border-black border hover:cursor-pointer rounded-md"}>
                <Icon name={'github'} prefix={"fab"}/>
            </a>
            <a target="_blank" rel="noopener noreferrer" href={"https://www.linkedin.com/in/zaniad/"} className={"h-10 text-2xl w-10 p-2.5 mx-1 flex items-center justify-center hover:bg-orange-500/60 border-black border hover:cursor-pointer rounded-md"}>
                <Icon name={'linkedin'} prefix={"fab"}/>
            </a>
            <a target="_blank" rel="noopener noreferrer" href={"mailto:austinzani@gmail.com"} className={"h-10 text-2xl w-10 p-2.5 mx-1 flex items-center justify-center hover:bg-orange-500/60 border-black border hover:cursor-pointer rounded-md"}>
                <Icon name={'envelope'} />
            </a>
        </div>
      </div>
  );
}
