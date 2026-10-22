import { useEffect, useRef } from 'react';

interface MobileCategoryNavProps {
  categories: Array<{ category: string; count: number }>;
  selectedCategory?: string;
  totalCount: number;
  onSelect: (category?: string) => void;
}

export function MobileCategoryNav({
  categories,
  selectedCategory,
  totalCount,
  onSelect,
}: MobileCategoryNavProps) {
  const selectedRef = useRef<HTMLButtonElement>(null);
  const isAllSelected = !selectedCategory;
  const availableCategories = categories.filter(({ count }) => count > 0);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [selectedCategory]);

  if (availableCategories.length === 0) return null;

  const buttonClass = (selected: boolean) =>
    `shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 dark:focus-visible:ring-white ${
      selected
        ? 'border-black bg-black text-white shadow-sm'
        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
    }`;

  return (
    <section className="border-b border-gray-200 bg-white px-3 py-3 md:hidden dark:border-gray-800 dark:bg-gray-950">
      <div
        className="flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="group"
        aria-label="Product categories"
      >
        <button
          ref={isAllSelected ? selectedRef : undefined}
          type="button"
          onClick={() => onSelect()}
          aria-pressed={isAllSelected}
          className={buttonClass(isAllSelected)}
        >
          All <span className="ml-1 opacity-75">{totalCount}</span>
        </button>
        {availableCategories.map(({ category, count }) => {
          const selected = selectedCategory === category;

          return (
            <button
              ref={selected ? selectedRef : undefined}
              type="button"
              key={category}
              onClick={() => onSelect(category)}
              aria-pressed={selectedCategory === category}
              className={buttonClass(selected)}
            >
              {category} <span className="ml-1 opacity-75">{count}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
