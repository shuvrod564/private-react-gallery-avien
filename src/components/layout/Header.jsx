import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, Camera, LayoutDashboard, Search, Lock } from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';
import { useAuth } from '../../contexts/AuthContext';
import { PUBLIC_ROUTES } from '../../utils/constants';
import { usePoster } from '../../contexts/PosterContext';
import { Eye, EyeOff } from 'lucide-react';

const linkClass = ({ isActive }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive
    ? 'bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-white'
    : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white'
  }`;

export function Header() {
  const [open, setOpen] = useState(false);
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const { showPoster, togglePoster } = usePoster();

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/80 backdrop-blur dark:border-stone-800 dark:bg-stone-950/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5" aria-label="Gallery home">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-stone-900 text-brand-400 dark:bg-stone-800">
              <Camera className="h-5 w-5" aria-hidden />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">Personal Gallery</span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
            {PUBLIC_ROUTES.filter((r) => r.path !== '/').map((r) => (
              <NavLink key={r.path} to={r.path} className={linkClass}>
                {r.label}
              </NavLink>
            ))}
            {isAdmin && (
              <NavLink to="/admin" className={linkClass}>
                <span className="inline-flex items-center gap-1.5">
                  <LayoutDashboard className="h-4 w-4" aria-hidden /> Dashboard
                </span>
              </NavLink>
            )}
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/gallery')}
              aria-label="Search gallery"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-500 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
            >
              <Search className="h-4 w-4" aria-hidden />
            </button>
            <ThemeToggle />
            {!user && (
              <Link
                to="/admin/login"
                className="hidden rounded-lg px-3 py-1.5 text-sm font-medium text-stone-500 hover:text-stone-900 dark:text-stone-400 sm:inline-block"
              >
                Admin
              </Link>
            )}
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 lg:hidden dark:border-stone-700"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label="Toggle menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {open && (
          <nav className="border-t border-stone-200 bg-white px-4 py-3 lg:hidden dark:border-stone-800 dark:bg-stone-950" aria-label="Mobile">
            <div className="flex flex-col gap-1">
              {PUBLIC_ROUTES.map((r) => (
                <NavLink key={r.path} to={r.path} className={linkClass} onClick={() => setOpen(false)}>
                  {r.label}
                </NavLink>
              ))}
              {isAdmin && (
                <NavLink to="/admin" className={linkClass} onClick={() => setOpen(false)}>
                  Dashboard
                </NavLink>
              )}
            </div>
          </nav>
        )}

      </header>
      <div className="fixed top-[70%] right-2 md:right-4 bg-white/50 backdrop-blur-2xl p-2 z-50 flex flex-col gap-2 rounded-lg"> 
        <button
          type="button"
          onClick={togglePoster}
          aria-label={showPoster ? 'Hide poster blur' : 'Show poster blur'}
          className="size-8 md:size-10 inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white p-2 md:p-3 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700 transition-colors cursor-pointer"
        >
          {showPoster ? (
            <>
              <EyeOff className="h-4 w-4" aria-hidden />
              <span className='hidden'>Hide Poster</span>
            </>
          ) : (
            <>
              <Eye className="h-4 w-4" aria-hidden />
              <span className='hidden'>Show Poster</span>
            </>
          )}
        </button>
        <Link to="/admin/login"
          className="size-8 md:size-10 inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white p-2 md:p-3 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700 transition-colors cursor-pointer"
        >
          <Lock />
        </Link>
      </div>
    </>
  );
}
