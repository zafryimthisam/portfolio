"use client";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import {
  IconBriefcaseFilled,
  IconHomeFilled,
  IconSettingsFilled,
} from "@tabler/icons-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { usePathname } from "next/navigation";
export default function NavBar() {
  const pathname = usePathname();

  const linkStyle = (path: string) =>
    `flex items-center gap-3 px-4 py-2 rounded-full transition-all duration-200 ${pathname === path ? "bg-white text-black" : "text-white hover:bg-white hover:text-black"}`;
  return (
    <div className="min-h-[50px] bg-black text-white border-b border-neutral-700  p-4 ">
      <div className="flex justify-between items-center w-full">
        <Link href={"/"}>
          <p className="flex items-center gap-3 text-2xl font-bold">
            <Avatar>
              <AvatarImage src="https://media.licdn.com/dms/image/v2/D5603AQGVwR8p1v18KA/profile-displayphoto-crop_800_800/B56ZyZIVr0KgAM-/0/1772095630438?e=1773878400&v=beta&t=PilJyiE9jGon-tHPgVUMv_hfCNtGQ-pvXcND9wJNU9k" />
              <AvatarFallback>Z</AvatarFallback>
            </Avatar>
            Zafry Imthisam
          </p>
        </Link>

        <div className="flex gap-24">
          <Link href={"/"} className={linkStyle("/")}>
            <IconHomeFilled size={26} />
            <span>Home</span>
          </Link>

          <Link href={"/projects"} className={linkStyle("/projects")}>
            <IconBriefcaseFilled size={26} />
            <span>Projects</span>
          </Link>

          <Link href={"/tools"} className={linkStyle("/tools")}>
            <IconSettingsFilled size={26} />
            <span>Tools</span>
          </Link>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 " />
          <Input
            type="search"
            placeholder="search..."
            className="pl-8 h-8 w-40 text-sm border-2 border-white"
          />
        </div>
      </div>
    </div>
  );
}
