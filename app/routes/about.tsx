import React from "react";


const About = () => {
    return (
        <div className={'flex justify-center w-full'}>
            <div className={"h-full w-full max-w-xl flex flex-col items-center justify-center"}>
                <div className="p-6 rounded-lg shadow-lg ">
                    <h1 className="text-3xl font-bold mb-8">Hello! I'm Austin Zani</h1>
                    <p className={"pb-5"}>I'm a software developer based in Cincinnati, OH.
                        I am a husband to my amazing wife Cath and father to our two lovely children, Anderson and Quinn.</p>

                    <p className={"pb-5"}>Apart from coding, I am an avid sports fan. I am a proud <span className={"text-red-600"}>University of Cincinnati Bearcat</span> alumni,
                        a <span className={"text-orange-500"}>Cincinnati Bengals</span> season ticket holder, and a die hard <span className={"text-green-600"}>Boston Celtics</span> fan.</p>

                    <p className={"pb-5"}>Music plays a big part in my life.
                        I love discovering new music and going to concerts. 
                        I have been collecting vinyls for over 10 years and am very proud of my collection.</p>

                    <p className={"pb-5"}>I am an outspoken Apple fanboy 👨🏼‍💻.
                        I worked at the Apple Store when they were still selling the original iPhone 📱.
                        The launch of the App Store and how it changed the way we interact with our phones is what inspired me to eventually become a developer</p>

                    <p className={"pb-5"}>I completed <span className={"text-blue-300"}>Tech Elevator</span> Coding Bootcamp in 2020, and have since gained significant experience
                        in various coding technologies. I am proficient in Javascript, Typescript, React, Python, AWS, Swift, and SwiftUI, and am always eager to learn more.</p>

                    <p className={"pb-5"}>Currently, I work as a Developer at <span className={"text-purple-500"}>Pay Theory</span>. I get to be a part of building
                        awesome payment solutions to help our partners enable inclusive payments in their platforms.</p>

                    <p className={"pb-5"}>This website is my playground, where I experiment with new technologies and share my passions
                        with the world. It was created using React, Typescript, Tailwind CSS, Remix, and Supabase.</p>

                    <p>Thank you for stopping by and getting to know me better. I am excited to continue to grow this site.</p>
                </div>
            </div>
        </div>
    )
}

export default About