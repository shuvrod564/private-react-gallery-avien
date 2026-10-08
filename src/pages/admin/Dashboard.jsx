import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Images,
  CheckCircle2,
  FileEdit,
  Star,
  FolderTree,
  Tags,
  Users,
  BookOpen,
  Eye,
  Activity,
} from 'lucide-react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { getDashboardStats, getRecentActivity, listImages } from '../../services/imageService';
import { formatNumber, formatDateTime } from '../../utils/format';
import { cloudinaryUrl } from '../../lib/cloudinary';
import { CardSkeleton } from '../../components/admin/CardSkeleton';

export default function Dashboard() {
  useDocumentTitle('Dashboard', { description: 'Admin dashboard.' });
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [top, setTop] = useState([]);
  const [activity, setActivity] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      getDashboardStats(),
      listImages({ sort: 'newest', pageSize: 6, publishedOnly: false }),
      listImages({ sort: 'most_viewed', pageSize: 6, publishedOnly: false }),
      getRecentActivity(8),
    ])
      .then(([s, r, t, a]) => {
        if (!active) return;
        setStats(s);
        setRecent(r.items);
        setTop(t.items);
        setActivity(a);
      })
      .catch((err) => active && setError(err.message));
    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return <p className="text-sm text-red-600 dark:text-red-400">Something went wrong. Please try again.</p>;
  }

  const cards = stats
    ? [
        { label: 'Total Images', value: stats.total_images, icon: Images, tone: 'text-brand-500' },
        { label: 'Published', value: stats.published_images, icon: CheckCircle2, tone: 'text-emerald-500' },
        { label: 'Drafts', value: stats.draft_images, icon: FileEdit, tone: 'text-stone-500' },
        { label: 'Featured', value: stats.featured_images, icon: Star, tone: 'text-amber-500' },
        { label: 'Categories', value: stats.categories, icon: FolderTree, tone: 'text-sky-500' },
        { label: 'Tags', value: stats.tags, icon: Tags, tone: 'text-violet-500' },
        { label: 'Authors', value: stats.authors, icon: Users, tone: 'text-pink-500' },
        { label: 'Albums', value: stats.albums, icon: BookOpen, tone: 'text-indigo-500' },
        { label: 'Total Views', value: stats.total_views, icon: Eye, tone: 'text-teal-500' },
      ]
    : [];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-2xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">Overview of your gallery.</p>
      </header>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        {stats
          ? cards.map((c) => (
              <div key={c.label} className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
                <c.icon className={`h-5 w-5 ${c.tone}`} aria-hidden />
                <p className="mt-3 font-display text-2xl font-semibold">{formatNumber(c.value)}</p>
                <p className="text-xs text-stone-500 dark:text-stone-400">{c.label}</p>
              </div>
            ))
          : Array.from({ length: 10 }).map((_, i) => <CardSkeleton key={i} />)}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent uploads */}
        <section className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Recent uploads</h2>
            <Link to="/admin/images" className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
              Manage all
            </Link>
          </div>
          <div className="space-y-3">
            {recent.map((img) => (
              <Link key={img.id} to={`/admin/images/${img.id}/edit`} className="flex items-center gap-3 rounded-xl p-2 hover:bg-stone-50 dark:hover:bg-stone-800">
                <Thumb img={img} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{img.title}</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">{formatDateTime(img.created_at)}</p>
                </div>
                <span className={`text-[11px] font-medium ${img.is_published ? 'text-emerald-500' : 'text-stone-400'}`}>
                  {img.is_published ? 'Published' : 'Draft'}
                </span>
              </Link>
            ))}
            {stats && recent.length === 0 && (
              <p className="text-sm text-stone-400">No images yet. <Link to="/admin/images/upload" className="text-brand-600 hover:underline">Upload your first image</Link>.</p>
            )}
          </div>
        </section>

        {/* Top viewed */}
        <section className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
          <h2 className="mb-4 font-semibold">Most viewed</h2>
          <div className="space-y-3">
            {top.map((img) => (
              <Link key={img.id} to={`/admin/images/${img.id}/edit`} className="flex items-center gap-3 rounded-xl p-2 hover:bg-stone-50 dark:hover:bg-stone-800">
                <Thumb img={img} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{img.title}</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">{formatNumber(img.view_count)} views</p>
                </div>
              </Link>
            ))}
            {stats && top.length === 0 && <p className="text-sm text-stone-400">No views yet.</p>}
          </div>
        </section>
      </div>

      {/* Recent activity */}
      <section className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
        <h2 className="mb-4 flex items-center gap-2 font-semibold">
          <Activity className="h-4 w-4 text-stone-400" aria-hidden /> Recent activity
        </h2>
        {activity.length === 0 ? (
          <p className="text-sm text-stone-400">No activity recorded yet.</p>
        ) : (
          <ul className="divide-y divide-stone-100 dark:divide-stone-800">
            {activity.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                <span className="text-stone-700 dark:text-stone-200">{a.action}</span>
                <span className="shrink-0 text-xs text-stone-400">{formatDateTime(a.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Thumb({ img }) {
  return (
    <span className="grid h-11 w-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-stone-100 dark:bg-stone-800">
      {img.cloudinary_public_id ? (
        <img src={cloudinaryUrl({ publicId: img.cloudinary_public_id, width: 112, height: 88 })} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : null}
    </span>
  );
}
