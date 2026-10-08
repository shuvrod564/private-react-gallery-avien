import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Images,
  UploadCloud,
  FolderTree,
  Tags,
  Users,
  BookOpen,
  Settings,
  LogOut,
  ExternalLink,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { signOut } from '../../services/authService';

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/images', label: 'Images', icon: Images },
  { to: '/admin/images/upload', label: 'Upload Image', icon: UploadCloud },
  { to: '/admin/categories', label: 'Categories', icon: FolderTree },
  { to: '/admin/tags', label: 'Tags', icon: Tags },
  { to: '/admin/authors', label: 'Authors', icon: Users },
  { to: '/admin/albums', label: 'Albums', icon: BookOpen },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

export function AdminSidebar({ mobileOpen, onClose }) {
  const { profile } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  async function handleLogout() {
    await signOut();
    toast.info('Signed out.');
    navigate('/admin/login');
  }

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 py-5">
        <NavLink to="/admin" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-500 font-display text-lg font-bold text-white">
            G
          </span>
          <div>
            <p className="text-sm font-semibold leading-tight">Personal Gallery</p>
            <p className="text-xs text-stone-400">Admin</p>
          </div>
        </NavLink>
        <button type="button" onClick={onClose} aria-label="Close menu" className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-800 lg:hidden">
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3" aria-label="Admin">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-500/15 text-brand-500'
                  : 'text-stone-400 hover:bg-stone-800 hover:text-white'
              }`
            }
          >
            <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-stone-800 p-3">
        <NavLink
          to="/" target='_blank'
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-stone-400 hover:bg-stone-800 hover:text-white"
        >
          <ExternalLink className="h-[18px] w-[18px]" aria-hidden /> View site
        </NavLink>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-stone-400 hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut className="h-[18px] w-[18px]" aria-hidden /> Logout
        </button>
        <p className="mt-2 truncate px-3 text-xs text-stone-500">{profile?.email}</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden w-64 shrink-0 border-r border-stone-800 bg-stone-950 lg:block dark:bg-stone-950">
        {content}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <div className="absolute inset-0 bg-stone-950/60" onClick={onClose} aria-hidden />
          <aside className="absolute inset-y-0 left-0 w-72 bg-stone-950 shadow-2xl animate-fade-in">{content}</aside>
        </div>
      )}
    </>
  );
}
