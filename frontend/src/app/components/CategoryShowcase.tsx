import { Loader2 } from 'lucide-react';
import { Link } from 'react-router';
import { getCloudinaryImageUrl } from '../utils/cloudinaryImage';
interface CategoryShowcaseProps {
  categories: { name: string; image: string }[];
  loading: boolean;
  error: string | null;
}

export function CategoryShowcase({ categories, loading, error }: CategoryShowcaseProps) {
  const categoryArtwork: Record<string, string> = {
    boots: '/category-art/boots.svg',
    heels: '/category-art/heels.svg',
    sandals: '/category-art/sandals.svg',
    flats: '/category-art/flats.svg',
    sneakers: '/category-art/sneakers.svg',
  };
  const categoryItems = categories.slice(0, 5).map(({ name: category, image }) => ({
    category,
    artwork: image || categoryArtwork[category.trim().toLocaleLowerCase()],
  }));

  return (
    <section
      aria-label="Product categories"
      className="category-showcase"
    >
      <div>
        {loading && categories.length === 0 ? (
          <div className="flex min-h-72 items-center justify-center" role="status" aria-label="Loading categories">
            <Loader2 className="size-8 animate-spin" />
          </div>
        ) : error && categories.length === 0 ? (
          <p className="border-y border-neutral-200 py-16 text-center text-neutral-600">Categories are taking a moment to load.</p>
        ) : categoryItems.length === 0 ? (
          <p className="border-y border-neutral-200 py-16 text-center text-neutral-600">New collections are coming soon.</p>
        ) : (
          <nav className="category-showcase-rail" aria-label="Shop by category">
            {categoryItems.map(({ category, artwork }) => {
              return (
                <Link
                  key={category}
                  to={`/category/${encodeURIComponent(category)}`}
                  aria-label={`Shop all ${category} products`}
                  className="category-showcase-card"
                >
                  {artwork && <img className="category-showcase-image" src={getCloudinaryImageUrl(artwork, 480)} alt="" loading="lazy" decoding="async" />}
                  <h3>{category}</h3>
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </section>
  );
}
