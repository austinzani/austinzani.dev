import one from '../images/memoji_1.png'
import two from '../images/memoji_2.png'
import three from '../images/memoji_3.png'
import four from '../images/memoji_4.png'
import five from '../images/memoji_5.png'
import six from '../images/memoji_6.png'
const memojis = [one, two, three, four, five, six]

export default function Index() {
    // Get a random number between 0 and 5
    const random = Math.floor(Math.random() * 6);
  return (
      <div className="w-full h-full flex items-center flex-col">
        <img className={"w-60 h-60 mt-20 mb-4"} src={memojis[random]}/>
        <h1 className="font-['Outfit'] w-fit font-medium text-4xl">Austin Zani</h1>
        <h2 className="font-['Outfit'] text-gray-400 w-fit font-light text-l">Husband, Father, Sports Addict, Software Developer</h2>
      </div>
  );
}
