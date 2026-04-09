"use client";

import Beams from "@/components/Beams";
import { useGSAP } from "@gsap/react";
import { IconArrowNarrowRight } from "@tabler/icons-react";
import gsap from "gsap";
import Link from "next/link";
import StackIcon from "tech-stack-icons";
import { useRef } from "react";

export default function HomeClient() {
  const workButton = useRef(null);
  useGSAP(() => {
    gsap.from(["#play-box", "#readme-box", "#work-box"], {
      y: 200,
      opacity: 0,
      duration: 1.2,
      stagger: 0.2,
      ease: "power3.out",
      force3D: true,
    });
  });

  return (
    <div className="flex-col p-3 gap-4 bg-neutral-950 font-mono text-white flex-1 md:p-5 flex md:flex-row md:gap-4 overflow-hidden">
      <div
        id="play-box"
        className="bg-black md:w-200 border border-neutral-700 rounded-lg p-3"
      >
        <h1 className="text-3xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-amber-200 to-yellow-500 bg-clip-text text-transparent">
          Create. Code. Solve
        </h1>
        <h2 className="text-lg md:text-2xl text-zinc-300 mb-6 ">
          From Simple Ideas, to powerful solutions
        </h2>

        <div
          className="flex justify-center items-center mx-auto md:w-[80%] w-full relative"
          style={{ aspectRatio: "1 / 1" }}
        >
          <Beams
            beamWidth={2}
            beamHeight={15}
            beamNumber={12}
            lightColor="#ffffff"
            speed={2}
            noiseIntensity={1.75}
            scale={0.2}
            rotation={0}
          />
        </div>
        <p className="text-zinc-400 mt-6 text-sm">
          The above animated component is from React Bits.
        </p>
      </div>
      <div className="flex md:flex-col flex-col gap-4 flex-1">
        <div
          id="readme-box"
          className="bg-black flex-1 border border-neutral-700 rounded-lg p-3"
        >
          <h1 className="text-4xl md:text-5xl mb-6 font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent tracking-widest">
            README.md
          </h1>
          <p className="text-sm md:text-base text-zinc-300 mb-4 md:pr-6 text-justify">
            The first thing we all learned about to write was My-Self. But you
            know I&apos;m still struggling to write even 100 words about me 😂.
            Instead of writing an essay, I came up with an idea to build this
            website so you all can get to know about me!
          </p>
          <h2 className="text-lg md:text-xl mb-2">
            For the love of technical people
          </h2>
          <p className="text-sm md:text-base text-zinc-300 mb-6 text-justify md:pr-6">
            I&apos;m a Computer Science undergraduate at SLIIT City Campus with
            hands-on experience in building full-stack web applications. I enjoy
            turning ideas into working systems and continuously learning modern
            technologies. I&apos;m seeking an internship where I can contribute,
            learn from experienced developers, and improve my practical skills.
          </p>
          <p className="text-sm md:text-base">
            It truly means a lot that you took the time to be here. Thank you.
          </p>
        </div>
        <div
          id="work-box"
          className="bg-black flex-1 border border-neutral-700 rounded-lg p-3 flex flex-col"
        >
          <h1 className="text-4xl md:text-5xl leading-normal font-bold bg-gradient-to-r from-teal-200 to-teal-500 bg-clip-text text-transparent">
            Want to explore my Works ?
          </h1>
          <p className="text-neutral-400 mt-3 text-justify md:pr-6">
            A collection of my experiments, projects, and ideas built with
            modern technologies. From web apps to creative coding.
          </p>
          <div className="flex md-gap-12 gap-2">
            <div
              ref={workButton}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const mouseX = e.clientX - rect.left - rect.width / 2;
                const mouseY = e.clientY - rect.top - rect.height / 2;
                gsap.to(e.currentTarget, {
                  x: mouseX * 0.3,
                  y: mouseY * 0.3,
                  duration: 0.2,
                  ease: "power2.out",
                });
              }}
              onMouseLeave={(e) => {
                gsap.to(e.currentTarget, {
                  x: 0,
                  y: 0,
                  duration: 0.3,
                  ease: "power2.out",
                });
              }}
              className="bg-amber-500 w-fit px-2 md:p-4 mt-6 "
            >
              <Link
                className="text-lg md:text-2xl flex items-center gap-4"
                href={"/works"}
              >
                Explore works <IconArrowNarrowRight size={32} />
              </Link>
            </div>
            <div
              ref={workButton}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const mouseX = e.clientX - rect.left - rect.width / 2;
                const mouseY = e.clientY - rect.top - rect.height / 2;
                gsap.to(e.currentTarget, {
                  x: mouseX * 0.3,
                  y: mouseY * 0.3,
                  duration: 0.2,
                  ease: "power2.out",
                });
              }}
              onMouseLeave={(e) => {
                gsap.to(e.currentTarget, {
                  x: 0,
                  y: 0,
                  duration: 0.3,
                  ease: "power2.out",
                });
              }}
              className="bg-blue-600 w-fit px-2 md:p-4 mt-6 "
            >
              <Link
                className="text-lg md:text-2xl flex items-center gap-4"
                href={"/tools"}
              >
                Explore Tools <IconArrowNarrowRight size={32} />
              </Link>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 md:gap-8 mt-10 justify-center">
            <StackIcon name="react" className="w-7 md:w-16" variant="dark" />
            <StackIcon name="nextjs2" className="w-7 md:w-16" variant="dark" />
            <StackIcon name="prisma" className="w-7 md:w-16" variant="dark" />
            <StackIcon name="js" className="w-7 md:w-16" variant="dark" />
            <StackIcon
              name="typescript"
              className="w-7 md:w-16"
              variant="dark"
            />
            <StackIcon name="gsap" className="w-7 md:w-16" variant="dark" />
            <StackIcon
              name="tailwindcss"
              className="w-10 md:w-16"
              variant="dark"
            />
            <StackIcon name="github" className="w-10 md:w-16" variant="dark" />
          </div>
        </div>
      </div>
    </div>
  );
}
