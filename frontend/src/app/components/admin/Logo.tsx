interface LogoProps {
  className?: string;
  showSubtitle?: boolean;
}

export function Logo({ className = '', showSubtitle = true }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img
        src="/shoe-style-logo.svg"
        alt="Shoe Style"
        className="h-10 w-auto object-contain"
      />
      {showSubtitle ? (
        <div className="flex flex-col">
          <span className="font-bold text-lg leading-tight dark:text-white">
            Shoe Style
          </span>
          <span className="text-xs text-muted-foreground leading-tight">
            Admin Panel
          </span>
        </div>
      ) : null}
    </div>
  );
}
