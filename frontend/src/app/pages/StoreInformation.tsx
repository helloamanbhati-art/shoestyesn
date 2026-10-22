import { Link, useLocation } from 'react-router';
import { CreditCard, ExternalLink, Instagram, Mail, MapPin, MessageCircle, Phone, RefreshCw, Ruler, Truck } from 'lucide-react';
import { STORE } from '../config/store';

const pages = {
  '/about-us': {
    eyebrow: 'Our store', title: `About ${STORE.name}`, intro: STORE.tagline,
    body: 'Visit Shoe Style at Shop No. 14 in Sarojini Nagar Market. We offer footwear in sizes 35 to 41, with new categories, product details, photos, prices, delivery information, and offers coming soon.',
  },
  '/contact-us': {
    eyebrow: 'We are here to help', title: `Contact ${STORE.name}`,
    intro: 'Questions about a product, colour, size, or order? Call, WhatsApp, DM us on Instagram, or visit the store.',
    body: 'Keep your product screenshot or order number ready so the team can help quickly.',
  },
  '/size-guide': {
    eyebrow: 'Find your fit', title: 'Size Guide',
    intro: `Shoe Style currently offers footwear in sizes ${STORE.availableSizes}.`,
    body: 'Check the product-specific size options before adding an item to your cart. Contact the store if you need help choosing the right fit.',
  },
  '/shipping-delivery': {
    eyebrow: 'Order information', title: 'Shipping & Delivery',
    intro: 'Delivery availability, charges, and timelines will be added soon.',
    body: `${STORE.paymentMethods} ${STORE.exchangePolicy}`,
  },
} as const;

export function StoreInformation() {
  const { pathname } = useLocation();
  const page = pages[pathname as keyof typeof pages] ?? pages['/about-us'];

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{page.eyebrow}</p>
      <h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">{page.title}</h1>
      <p className="mt-6 max-w-3xl text-lg leading-8 text-foreground/75">{page.intro}</p>
      <div className="mt-10 border-y border-border py-8">
        <p className="max-w-3xl leading-7 text-foreground/70">{page.body}</p>

        {pathname === '/about-us' && (
          <section className="mt-8" aria-labelledby="store-details-heading">
            <h2 id="store-details-heading" className="text-xl font-semibold">Store details</h2>
            <dl className="mt-5 grid gap-px overflow-hidden border bg-border sm:grid-cols-2">
              <div className="flex gap-3 bg-background p-5"><Mail className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" /><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</dt><dd className="mt-1"><a href={`mailto:${STORE.email}`} className="font-medium hover:underline">{STORE.email}</a></dd></div></div>
              <div className="flex gap-3 bg-background p-5"><Phone className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" /><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Phone</dt><dd className="mt-1 space-y-1">{STORE.phones.map((phone) => <a key={phone} href={`tel:+91${phone}`} className="block font-medium hover:underline">{phone}</a>)}</dd></div></div>
              <div className="flex gap-3 bg-background p-5"><MessageCircle className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" /><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">WhatsApp</dt><dd className="mt-1 space-y-1">{STORE.whatsappNumbers.map((phone) => <a key={phone} href={`https://wa.me/91${phone}`} target="_blank" rel="noreferrer" className="block font-medium hover:underline">{phone}</a>)}</dd></div></div>
              <div className="flex gap-3 bg-background p-5"><Instagram className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" /><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Social media</dt><dd className="mt-1 space-y-1">{STORE.socialProfiles.map((profile) => <a key={profile.handle} href={profile.url} target="_blank" rel="noreferrer" className="block font-medium hover:underline">{profile.handle}</a>)}</dd></div></div>
              <div className="flex gap-3 bg-background p-5 sm:col-span-2"><MapPin className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" /><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Store address</dt><dd className="mt-1 max-w-2xl leading-6">{STORE.address}</dd></div></div>
              <div className="flex gap-3 bg-background p-5"><Ruler className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" /><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Available sizes</dt><dd className="mt-1 font-medium">{STORE.availableSizes}</dd></div></div>
              <div className="flex gap-3 bg-background p-5"><CreditCard className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" /><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Payment</dt><dd className="mt-1 leading-6">{STORE.paymentMethods}</dd></div></div>
              <div className="flex gap-3 bg-background p-5 sm:col-span-2"><RefreshCw className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" /><div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Exchange policy</dt><dd className="mt-1 leading-6">{STORE.exchangePolicy}</dd></div></div>
            </dl>
          </section>
        )}

        {pathname === '/contact-us' && (
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <a href={`https://wa.me/91${STORE.whatsappNumbers[0]}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 border p-4 hover:bg-accent"><MessageCircle className="size-5" /><span className="text-sm">WhatsApp</span></a>
            <a href={`tel:+91${STORE.phones[0]}`} className="flex items-center gap-3 border p-4 hover:bg-accent"><Phone className="size-5" /><span className="text-sm">Call {STORE.phones[0]}</span></a>
            <a href={`mailto:${STORE.email}`} className="flex items-center gap-3 border p-4 hover:bg-accent"><Mail className="size-5" /><span className="text-sm">Email us</span></a>
            <div className="flex items-center gap-3 border p-4"><MapPin className="size-5" /><span className="text-sm">Visit Sarojini Nagar Market</span></div>
          </div>
        )}

        {pathname === '/size-guide' && <div className="mt-8 flex items-start gap-4 bg-muted/50 p-5"><Ruler className="mt-0.5 size-5 shrink-0" /><p className="text-sm leading-6">Send a photo or product link on WhatsApp with your usual size for product-specific guidance.</p></div>}
        {pathname === '/shipping-delivery' && <div className="mt-8 flex items-start gap-4 bg-muted/50 p-5"><Truck className="mt-0.5 size-5 shrink-0" /><p className="text-sm leading-6">Delivery details will be added soon. Online payment only; Cash on Delivery is not available. Exchanges are accepted, but returns are not.</p></div>}
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/?view=all" className="inline-flex min-h-11 items-center bg-primary px-5 text-sm font-semibold text-primary-foreground">Shop all products</Link>
        <a href={`https://wa.me/91${STORE.whatsappNumbers[0]}`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 border px-5 text-sm font-semibold"><MessageCircle className="size-4" />Ask on WhatsApp<ExternalLink className="size-3" /></a>
      </div>
    </main>
  );
}
