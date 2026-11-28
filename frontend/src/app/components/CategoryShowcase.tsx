import { Link } from 'react-router';
import { getCloudinaryImageUrl } from '../utils/cloudinaryImage';
interface CategoryShowcaseProps {
  categories: { name: string; image: string }[];
}

const INITIAL_CATEGORIES = ['Heels', 'Sandals', 'Flats', 'Sneakers', 'Boots'];

export function CategoryShowcase({ categories }: CategoryShowcaseProps) {
  const categoryArtwork: Record<string, string> = {
    boots: '/category-art/boots.svg',
    heels: '/category-art/heels.svg',
    sandals: '/category-art/sandals.svg',
    flats: '/category-art/flats.svg',
    sneakers: '/category-art/sneakers.svg',
  };
  const visibleCategories = categories.length
    ? categories
    : INITIAL_CATEGORIES.map((name) => ({ name, image: '' }));
  const categoryItems = visibleCategories.slice(0, 5).map(({ name: category, image }) => ({
    category,
    artwork: image || categoryArtwork[category.trim().toLocaleLowerCase()],
  }));

  return (
    <section
      aria-label="Product categories"
      className="category-showcase"
    >
      <nav className="category-showcase-rail" aria-label="Shop by category">
        {categoryItems.map(({ category, artwork }) => (
          <Link
            key={category}
            to={`/category/${encodeURIComponent(category)}`}
            aria-label={`Shop all ${category} products`}
            className="category-showcase-card"
          >
            {artwork && <img className="category-showcase-image" src={getCloudinaryImageUrl(artwork, 480)} alt="" loading="lazy" decoding="async" />}
            <h3>{category}</h3>
          </Link>
        ))}
      </nav>
    </section>
  );
}
