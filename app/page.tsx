"use client";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
export default function Home() {
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
        <h1 className="text-3xl mb-6">Play Around</h1>
        <div className="flex gap-10 mb-6">
          <div className="h-20 w-20 bg-amber-400"></div>
        </div>

        <p className="text-zinc-400 text-sm">
          Don't take too much time playing here
        </p>
      </div>
      <div className="flex flex-col gap-4 flex-1">
        <div
          id="readme-box"
          className="bg-black flex-1 border border-neutral-700 rounded-lg p-3"
        >
          <h1 className="text-3xl mb-2">README.md</h1>
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
          <h1>Click the button below to see my works</h1>
        </div>
      </div>
    </div>
  );
}
