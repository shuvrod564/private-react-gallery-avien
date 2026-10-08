import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { getSettings, updateSettings } from '../../services/settingsService';
import { Field, Input, Select, Textarea } from '../../components/ui/Field';
import { Button } from '../../components/ui/Button';
import { Switch } from '../../components/ui/Switch';
import { Spinner, ErrorState } from '../../components/ui/Feedback';
import { useToast } from '../../contexts/ToastContext';
import { GALLERY_LAYOUTS } from '../../utils/constants';

export default function Settings() {
  useDocumentTitle('Settings', { description: 'Gallery settings.' });
  const toast = useToast();
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    getSettings()
      .then((s) => active && setSettings(s))
      .catch((err) => active && setError(err.message));
    return () => {
      active = false;
    };
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      await updateSettings({
        id: settings.id,
        site_title: settings.site_title,
        site_description: settings.site_description,
        logo_url: settings.logo_url,
        favicon_url: settings.favicon_url,
        default_layout: settings.default_layout,
        images_per_page: Number(settings.images_per_page),
        allow_download: settings.allow_download,
        social_links: settings.social_links,
        contact_email: settings.contact_email,
        contact_phone: settings.contact_phone,
      });
      toast.success('Settings saved.');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (error) return <ErrorState message={error} />;
  if (!settings) return <Spinner />;

  const set = (key) => (valueOrEvent) => {
    const value = typeof valueOrEvent === 'object' && 'target' in valueOrEvent ? valueOrEvent.target.value : valueOrEvent;
    setSettings((s) => ({ ...s, [key]: value }));
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">Site-wide configuration stored in Supabase.</p>
      </header>

      <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Site title" htmlFor="site-title">
            <Input id="site-title" value={settings.site_title} onChange={set('site_title')} />
          </Field>
          <Field label="Images per page" htmlFor="per-page">
            <Input id="per-page" type="number" min={1} max={100} value={settings.images_per_page} onChange={set('images_per_page')} />
          </Field>
        </div>

        <Field label="Site description" htmlFor="site-desc">
          <Textarea id="site-desc" rows={2} value={settings.site_description} onChange={set('site_description')} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Logo URL" htmlFor="logo">
            <Input id="logo" type="url" value={settings.logo_url || ''} onChange={set('logo_url')} placeholder="https://…" />
          </Field>
          <Field label="Favicon URL" htmlFor="favicon">
            <Input id="favicon" type="url" value={settings.favicon_url || ''} onChange={set('favicon_url')} placeholder="https://…" />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Default gallery layout" htmlFor="layout">
            <Select id="layout" value={settings.default_layout} onChange={set('default_layout')}>
              {GALLERY_LAYOUTS.map((l) => (
                <option key={l} value={l}>{l === 'grid' ? 'Grid' : 'Masonry'}</option>
              ))}
            </Select>
          </Field>
          <Field label="Contact email" htmlFor="contact-email">
            <Input id="contact-email" type="email" value={settings.contact_email || ''} onChange={set('contact_email')} />
          </Field>
        </div>

        <Field label="Contact phone" htmlFor="contact-phone">
          <Input id="contact-phone" value={settings.contact_phone || ''} onChange={set('contact_phone')} />
        </Field>

        <Field label="Social links (JSON)" htmlFor="social">
          <Textarea
            id="social"
            rows={2}
            value={typeof settings.social_links === 'string' ? settings.social_links : JSON.stringify(settings.social_links || {}, null, 2)}
            onChange={(e) => {
              let value = settings.social_links;
              try {
                value = JSON.parse(e.target.value || '{}');
              } catch {
                /* keep last valid */
              }
              setSettings((s) => ({ ...s, social_links: value }));
            }}
          />
        </Field>

        <label className="flex items-center gap-2 text-sm">
          <Switch checked={settings.allow_download} onChange={set('allow_download')} label="Allow image downloads" />
          Allow downloads (adds a download button on public image pages)
        </label>

        <div className="flex justify-end border-t border-stone-200 pt-4 dark:border-stone-800">
          <Button type="submit" loading={saving}>
            <Save className="h-4 w-4" aria-hidden /> Save settings
          </Button>
        </div>
      </form>
    </div>
  );
}
