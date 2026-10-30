import { Link } from 'react-router';
import type { Product } from '../types/product';

interface PromotionalPostersProps {
  products: Product[];
}

export function PromotionalPosters({ products }: PromotionalPostersProps) {
  const imageProducts = products.filter((product) => product.image || product.images?.[0]);
  const firstProduct = imageProducts[0];
  const secondProduct = imageProducts[Math.max(1, Math.floor(imageProducts.length / 2))] || firstProduct;
  const fallbackImage = '/shoe-style-sale-hero.png';

  const posters = [
    {
      title: 'New Collection',
      label: 'Shop new collection',
      image: firstProduct?.image || firstProduct?.images?.[0] || fallbackImage,
      className: 'is-new',
    },
    {
      title: 'Clearance Sale',
      label: 'Shop clearance sale',
      image: secondProduct?.image || secondProduct?.images?.[0] || fallbackImage,
      className: 'is-sale',
    },
  ];

  return (
    <section className="promotional-posters" aria-label="Featured promotions">
      {posters.map((poster) => (
        <Link key={poster.title} to="/products" className={`promotional-poster ${poster.className}`} aria-label={poster.label}>
          <span
            className="promotional-poster-image"
            style={{ backgroundImage: `url("${poster.image.replace(/"/g, '\\"')}")` }}
            aria-hidden="true"
          />
          <span className="promotional-poster-shade" aria-hidden="true" />
          <span className="promotional-poster-copy">
            <strong>{poster.title}</strong>
            <span>{poster.label}</span>
          </span>
        </Link>
      ))}
    </section>
  );
}
