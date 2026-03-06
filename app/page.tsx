"use client";

import Beams from "@/components/Beams";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Link from "next/link";
import { useRef } from "react";

export default function Home() {
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
    <div className="bg-neutral-950 font-mono text-white flex-1 p-5 flex flex-row gap-4 overflow-hidden">
      <div
        id="play-box"
        className="bg-black w-200 border border-neutral-700 rounded-lg p-3"
      >
        <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-amber-200 to-yellow-500 bg-clip-text text-transparent">
          Create. Code. Solve
        </h1>
        <h2 className="text-2xl text-zinc-300 mb-6 ">
          From Simple Ideas, to powerful solutions
        </h2>

        <div
          className="flex justify-center items-center mx-auto"
          style={{
            width: "80%",
            height: "auto",
            aspectRatio: "1 / 1",
            position: "relative",
          }}
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
      <div className="flex flex-col gap-4 flex-1">
        <div
          id="readme-box"
          className="bg-black flex-1 border border-neutral-700 rounded-lg p-3"
        >
          <h1 className="text-5xl mb-6 font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent tracking-widest">
            README.md
          </h1>
          <p className="text-zinc-300 mb-4 pr-6 text-justify">
            The first thing we all learned about to write was My-Self. But you
            know I am still struggling to write even 100 words about me 😂.
            Instead of writing an essay, I came up with an idea to build this
            website so you all can get to know about me !
          </p>
          <h2 className="text-xl mb-2">For the love of technical people</h2>
          <p className="text-zinc-300 mb-6 text-justify pr-6">
            I'm a Computer Science undergraduate at SLIIT City Campus with
            hands-on experience in building full-stack web applications. I enjoy
            turning ideas into working systems and continuously learning modern
            technologies. I'm seeking an internship where I can contribute,
            learn from experienced developers, and improve my practical skills.
          </p>
          <p>Go ahead an start exploring. Thanks!</p>
        </div>
        <div
          id="work-box"
          className="bg-black flex-1 border border-neutral-700 rounded-lg p-3"
        >
          <h1 className="text-5xl font-bold bg-gradient-to-r from-teal-200 to-teal-500 bg-clip-text text-transparent">
            Want to explore my Works ?
          </h1>
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
            className="bg-amber-500 w-fit p-4 mt-6"
          >
            <Link className="text-2xl" href={"/projects"}>
              Click Here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
