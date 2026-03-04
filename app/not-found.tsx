import Image from "next/image";

export default function NotFound() {
  return (
    <div className="bg-black text-white flex-1 flex justify-center items-center p-3 flex-col gap-6 ">
      <h1>Ahh, you came finding me?</h1>
      <Image
        className="w-[320px] md:w-full max-w-200 h-auto"
        src="https://images.pexels.com/photos/7284174/pexels-photo-7284174.jpeg"
        alt="You are Lost"
        width={800}
        height={453.135}
      />
    </div>
  );
}
