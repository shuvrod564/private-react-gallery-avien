import { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { ArrowUpRight, FolderTree, Menu, Plus } from 'lucide-react';
import { AdminSidebar } from './AdminSidebar';

export function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-stone-100 dark:bg-stone-950">
      <AdminSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-stone-200 bg-white/90 px-4 backdrop-blur dark:border-stone-800 dark:bg-stone-950/90">
          <div className="grow flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 lg:hidden dark:hover:bg-stone-800"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-sm font-semibold text-stone-700 dark:text-stone-200">Admin Console</h1>
          </div>

          <Link to={'/'} target='_blank' className='w-8 h-8 bg-amber-200 text-black rounded-full inline-flex items-center justify-center cursor-pointer'>
            <ArrowUpRight className='size-5' />
          </Link>
          <Link to={'/admin/images/upload'} className='w-8 h-8 bg-amber-200 text-black rounded-full inline-flex items-center justify-center cursor-pointer'>
            <Plus className='size-5' />
          </Link>
          <Link to={'/admin/categories'} className='w-8 h-8 bg-amber-200 text-black rounded-full inline-flex items-center justify-center cursor-pointer'>
            <FolderTree className='size-4' />
            <span className='hidden'>category</span>
          </Link>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
