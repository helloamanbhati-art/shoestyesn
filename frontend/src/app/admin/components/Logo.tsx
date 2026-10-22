import { cn } from '../../components/ui/utils';

interface LogoProps {
  className?: string;
  showSubtitle?: boolean;
}

export function Logo({ className, showSubtitle = true }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <img
        src="/shoe-style-logo.svg"
        alt="Shoe Style"
        className="h-10 w-auto object-contain"
      />
      {showSubtitle ? (
        <div>
          <h1 className="text-xl font-bold text-foreground">Shoe Style</h1>
          <p className="text-xs text-muted-foreground">Admin Panel</p>
        </div>
      ) : null}
    </div>
  );
}
