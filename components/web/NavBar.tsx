"use client";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import {
  IconBriefcaseFilled,
  IconHomeFilled,
  IconSettingsFilled,
  IconMenu2,
  IconX,
} from "@tabler/icons-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";

export default function NavBar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const linkStyle = (path: string) =>
    `flex items-center gap-3 px-4 py-2 md:rounded-full transition-all duration-200 ${
      pathname === path
        ? "bg-white text-black"
        : "text-white hover:bg-white hover:text-black"
    }`;

  return (
    <>
      {/* Mobile Top Bar — only shows name + hamburger, hidden on md+ */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-black text-white border-b border-neutral-700 px-4 py-3 md:hidden">
        <Link href="/">
          <p className="font-bold text-sm">Zafry Imthisam</p>
        </Link>
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => setIsOpen(true)}
          className={`text-white focus:outline-none ${isOpen ? "hidden" : "block"}`}
          aria-label="Open menu"
        >
          <IconMenu2 size={28} />
        </button>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar (mobile) / Top navbar (desktop) */}
      <div
        ref={navRef}
        className={`
          fixed top-0 left-0 h-dvh w-72 bg-black text-white border-r border-neutral-700 p-4 z-50
          transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          md:relative md:h-auto md:w-full md:translate-x-0 md:border-r-0 md:border-b md:z-auto
        `}
      >
        <div className="flex flex-col md:flex-row md:justify-between md:items-center w-full">
          {/* Close button — top-right, mobile only */}
          <div className="flex justify-end md:hidden mb-4">
            <button
              onClick={() => setIsOpen(false)}
              className="text-white focus:outline-none"
              aria-label="Close menu"
            >
              <IconX size={26} />
            </button>
          </div>

          {/* Logo — desktop only */}
          <Link href="/">
            <p className="hidden md:flex items-center gap-3 text-2xl font-bold">
              <Avatar>
                <AvatarImage src="https://media.licdn.com/dms/image/v2/D5603AQGVwR8p1v18KA/profile-displayphoto-crop_800_800/B56ZyZIVr0KgAM-/0/1772095630438?e=1773878400&v=beta&t=PilJyiE9jGon-tHPgVUMv_hfCNtGQ-pvXcND9wJNU9k" />
                <AvatarFallback>Z</AvatarFallback>
              </Avatar>
              Zafry Imthisam
            </p>
          </Link>

          {/* Nav Links */}
          <div className="flex flex-col md:flex-row md:gap-24 gap-2 my-2 md:my-0">
            <Link href="/" className={linkStyle("/")}>
              <IconHomeFilled size={26} />
              <span>Home</span>
            </Link>
            <Link href="/projects" className={linkStyle("/projects")}>
              <IconBriefcaseFilled size={26} />
              <span>Projects</span>
            </Link>
            <Link href="/tools" className={linkStyle("/tools")}>
              <IconSettingsFilled size={26} />
              <span>Tools</span>
            </Link>
          </div>

          {/* Search — desktop only */}
          <div className="relative hidden md:block">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4" />
            <Input
              type="search"
              placeholder="search..."
              className="pl-8 h-8 w-40 text-sm border-2 border-white"
            />
          </div>
        </div>
      </div>

      {/* Spacer for mobile top bar */}
      <div className="h-[52px] md:hidden" />
    </>
  );
}
