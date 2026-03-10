"use client";
import SignUpComponent from "@/components/web/SignUpComponent";
import StackIcon from "tech-stack-icons";
import { BetterAuth } from "@boxicons/react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(SplitText, ScrollTrigger);
export default function WorksPage() {
  useGSAP(() => {
    gsap.to("#animate-text", {
      ease: "power1.inOut",
      opacity: 1,
      y: 0,
    });

    gsap.from(["#signup-box", "#gsap-box"], {
      y: 200,
      opacity: 0,
      duration: 1.2,
      stagger: 0.2,
      ease: "power3.out",
      force3D: true,
    });
  }, []);
  return (
    <div className="p-3 bg-neutral-950 flex items-center flex-col flex-1 text-white">
      <div className="text-center mt-4">
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-amber-200 to-yellow-500 bg-clip-text text-transparent">
          From .Idea to .Code
        </h1>
      </div>

      <div
        id="signup-box"
        className="bg-black border border-neutral-700 py-4 px-6 w-fit md:w-[50%] mt-4"
      >
        <h2 className="text-lg md:text-2xl font-bold text-center md:flex md:justify-center">
          Create secure authentication with{" "}
          <span className="inline-flex items-center gap-1 mx-1">
            <BetterAuth />
            Better-Auth framework
          </span>
        </h2>
        <p className="text-sm md:text-base text-zinc-400 text-center mt-2">
          Try creating an Account. Your information is secured with us
        </p>
        <div className="w-full max-w-md mx-auto mt-3">
          <SignUpComponent />
        </div>
      </div>

      <div
        id="gsap-box"
        className=" bg-black border border-neutral-700 py-4 px-6 w-fit md:w-[50%] mt-4"
      >
        <div className="flex flex-col md:flex-row items-center md:justify-center gap-2">
          <h2 className="text-lg md:text-2xl font-bold text-center">
            Create Awesome <span className="italic">Looking</span> Animations
            using{" "}
            <span className="inline-flex items-center align-middle translate-y-[-2px]">
              <StackIcon name="gsap" className="w-10 md:w-14" variant="dark" />
            </span>
          </h2>
        </div>
        <h2
          id="animate-text"
          className="text-2xl my-3 md:text-4xl font-bold text-center opacity-0 translate-y-10 bg-gradient-to-r from-teal-200 to-teal-500 bg-clip-text text-transparent"
        >
          ANIMATE ANYTTHING WITH EASE
        </h2>
        <p className="text-sm md:text-base text-zinc-400">
          GSAP is a JavaScript animation library.
        </p>
      </div>
    </div>
  );
}
