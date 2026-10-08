import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { ConfigBanner } from './ConfigBanner';
import { ScrollToTop } from './ScrollToTop';

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <ConfigBanner />
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <ScrollToTop />
      <Footer />
    </div>
  );
}
