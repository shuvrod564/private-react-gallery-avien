import { Link } from 'react-router-dom';
import { Camera } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-stone-200 bg-white py-10 dark:border-stone-800 dark:bg-stone-950">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-stone-900 text-brand-400 dark:bg-stone-800">
              <Camera className="h-4 w-4" aria-hidden />
            </span>
            <span className="font-display text-base font-semibold">Personal Gallery</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-stone-500 dark:text-stone-400">
            A personal collection of photographs — moments captured, organized, and shared.
          </p>
        </div>
        <nav aria-label="Footer">
          <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Explore</h3>
          <ul className="mt-3 space-y-2 text-sm text-stone-500 dark:text-stone-400">
            <li><Link to="/gallery" className="hover:text-stone-900 dark:hover:text-white">Gallery</Link></li>
            <li><Link to="/categories" className="hover:text-stone-900 dark:hover:text-white">Categories</Link></li>
            <li><Link to="/albums" className="hover:text-stone-900 dark:hover:text-white">Albums</Link></li>
            <li><Link to="/authors" className="hover:text-stone-900 dark:hover:text-white">Authors</Link></li>
          </ul>
        </nav>
        <div>
          <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Account</h3>
          <ul className="mt-3 space-y-2 text-sm text-stone-500 dark:text-stone-400">
            <li><Link to="/admin/login" className="hover:text-stone-900 dark:hover:text-white">Admin login</Link></li>
          </ul>
        </div>
      </div>
      <div className="mx-auto mt-8 max-w-7xl border-t border-stone-100 px-4 pt-6 text-center text-xs text-stone-400 dark:border-stone-800 dark:text-stone-500">
        © {new Date().getFullYear()} Personal Gallery. All rights reserved.
      </div>
    </footer>
  );
}
