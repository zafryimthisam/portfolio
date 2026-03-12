import { Github, Gmail, InstagramAlt, LinkedinSquare } from "@boxicons/react";

export default function ContactPageClient() {
  return (
    <div className="flex-1">
      <div className="py-6 flex justify-center w-fit mx-auto items-center gap-3">
        <h1 className="text-3xl md:text-5xl font-bold">Hey👋🏻, Let's Talk </h1>
      </div>
      <div className="flex gap-2 flex-col justify-center bg-neutral-800 w-fit mx-auto py-2 px-4">
        <p className="font-bold">Find me in these platforms to connect</p>
        <a
          className="flex items-center gap-1 hover:bg-black px-1 py-2"
          href={"https://www.linkedin.com/in/zafry-imthisam/"}
          target="_blank"
        >
          <LinkedinSquare />
          LinkedIn
        </a>
        <a
          className="flex items-center gap-1 hover:bg-black px-1 py-2"
          href={"https://www.instagram.com/zafry.imthisam/"}
          target="_blank"
        >
          <InstagramAlt />
          Instagram
        </a>
        <a
          className="flex items-center gap-1 hover:bg-black px-1 py-2"
          href={"https://github.com/zafryimthisam"}
          target="_blank"
        >
          <Github />
          GitHub
        </a>

        <a
          className="flex items-center gap-1 hover:bg-black px-1 py-2"
          href={"mailto:mimzafry5@gmail.com"}
          target="_blank"
        >
          <Gmail />
          Gmail
        </a>
      </div>
    </div>
  );
}
