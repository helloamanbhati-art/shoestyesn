interface ShoeStyleLogoProps {
  className?: string;
  alt?: string;
}

export function ShoeStyleLogo({
  className = 'h-10 w-auto md:h-12',
  alt = 'Shoe Style',
}: ShoeStyleLogoProps) {
  return <img src="/shoe-style-logo.png" alt={alt} className={className} />;
}
