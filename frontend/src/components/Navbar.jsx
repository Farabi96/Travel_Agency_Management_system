 import { Compass, Menu, UserRound } from "lucide-react";
import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
        <Link to="/" className="flex items-center gap-2">
          <span className="rounded-xl bg-teal-600 p-2 text-white">
            <Compass size={23} />
          </span>
          <span className="text-xl font-bold tracking-tight text-slate-900">
            Travel<span className="text-teal-600">Mate</span>
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <Link to="/" className="font-medium text-teal-700">Home</Link>
          <a href="#destinations" className="text-slate-600 hover:text-teal-700">Destinations</a>
          <a href="#packages" className="text-slate-600 hover:text-teal-700">Packages</a>
          <a href="#about" className="text-slate-600 hover:text-teal-700">About</a>
        </div>

        <div className="hidden md:block">
          <button className="flex items-center gap-2 rounded-full bg-teal-600 px-5 py-2.5 font-semibold text-white transition hover:bg-teal-700">
            <UserRound size={17} />
            Sign in
          </button>
        </div>

        <button
          className="rounded-lg p-2 text-slate-700 md:hidden"
          aria-label="Open menu"
          onClick={() => alert("Mobile menu coming soon")}
        >
          <Menu size={25} />
        </button>
      </nav>
    </header>
  );
}