export default function Home() {
  return (
    <div className="bg-black font-mono text-white flex-1 p-5 flex flex-row gap-4">
      <div className=" w-200 border border-neutral-700 rounded-xl p-3">
        <h1 className="text-3xl">Explore More</h1>
        <p className="text-zinc-400 text-xs">Please read carefully</p>
      </div>
      <div className="flex flex-col gap-4 flex-1">
        <div className=" flex-1 border border-neutral-700 rounded-xl p-3">
          <h1 className="text-3xl">About Me</h1>
        </div>
        <div className=" flex-1 border border-neutral-700 rounded-xl p-3"></div>
      </div>
    </div>
  );
}
