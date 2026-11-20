import { Link } from 'react-router';
import type { Product } from '../types/product';
import { getCloudinaryImageUrl } from '../utils/cloudinaryImage';
import { isVideoMediaUrl } from '../utils/media';

interface PromotionalPostersProps {
  products: Product[];
}

export function PromotionalPosters({ products }: PromotionalPostersProps) {
  const getProductImage = (product: Product) => [product.image, ...(product.images || [])]
    .find((image): image is string => Boolean(image && !isVideoMediaUrl(image)));
  const imageProducts = products.filter((product) => getProductImage(product));
  const firstProduct = imageProducts[0];
  const secondProduct = imageProducts[Math.max(1, Math.floor(imageProducts.length / 2))] || firstProduct;
  const fallbackImage = '/shoe-style-sale-hero.png';
  const newCollectionImage = firstProduct ? getProductImage(firstProduct) || fallbackImage : fallbackImage;
  const saleImage = secondProduct ? getProductImage(secondProduct) || fallbackImage : fallbackImage;

  const posters = [
    {
      title: 'New Collection',
      label: 'Shop new collection',
      image: newCollectionImage,
      className: 'is-new',
    },
    {
      title: 'Clearance Sale',
      label: 'Shop clearance sale',
      image: saleImage,
      className: 'is-sale',
    },
  ];

  return (
    <section className="promotional-posters" aria-label="Featured promotions">
      {posters.map((poster) => (
        <Link key={poster.title} to="/products" className={`promotional-poster ${poster.className}`} aria-label={poster.label}>
          <span
            className="promotional-poster-image"
            style={{ backgroundImage: `url("${getCloudinaryImageUrl(poster.image, 960).replace(/"/g, '\\"')}")` }}
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
