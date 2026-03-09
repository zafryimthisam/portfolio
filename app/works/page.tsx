import SignUpComponent from "@/components/web/SignUpComponent";
import StackIcon from "tech-stack-icons";

export default function WorksPage() {
  return (
    <div className="p-3 bg-neutral-950 flex items-center flex-col flex-1 text-white">
      <div className="text-center mt-4">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-amber-200 to-yellow-500 bg-clip-text text-transparent">
          From .Idea to .Code
        </h1>
      </div>

      <div className="bg-black border border-neutral-700 rounded-lg py-4 px-6 w-[50%] mt-4">
        <h2 className="text-2xl font-bold flex">
          Create secure authentication with
          <span className="mx-3">
            <svg
              width="32"
              height="32"
              viewBox="0 0 500 500"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="500" height="500" fill="white" />
              <rect x="69" y="121" width="86.9879" height="259" fill="black" />
              <rect
                x="337.575"
                y="121"
                width="92.4247"
                height="259"
                fill="black"
              />
              <rect
                x="427.282"
                y="121"
                width="83.4555"
                height="174.52"
                transform="rotate(90 427.282 121)"
                fill="black"
              />
              <rect
                x="430"
                y="296.544"
                width="83.4555"
                height="177.238"
                transform="rotate(90 430 296.544)"
                fill="black"
              />
              <rect
                x="252.762"
                y="204.455"
                width="92.0888"
                height="96.7741"
                transform="rotate(90 252.762 204.455)"
                fill="black"
              />
            </svg>
          </span>{" "}
          Better-Auth framework
        </h2>
        <p className="text-zinc-400 text-center mt-2">
          Try creating an Account. Your information is secured with us
        </p>
        <div className="w-full max-w-md mx-auto mt-3">
          <SignUpComponent />
        </div>
      </div>

      <div className=" bg-black border border-neutral-700 rounded-lg p-3 w-[50%] mt-4">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">
            Create Awesome <span className="italic">Looking</span> Animations
            using
          </h2>
          <StackIcon name="gsap" className="w-7 md:w-16" variant="dark" />
        </div>
        <p className="text-zinc-400">Try hovering over elements</p>
      </div>
    </div>
  );
}
