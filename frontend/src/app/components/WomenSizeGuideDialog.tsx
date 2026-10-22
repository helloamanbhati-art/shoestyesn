import { Ruler } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { WOMEN_SHOE_SIZE_ROWS } from '../utils/womenShoeSizes';

export function WomenSizeGuideDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="inline-flex min-h-10 items-center gap-1.5 rounded-md px-2 text-sm font-semibold underline underline-offset-4 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Ruler className="size-4" aria-hidden="true" />
          Size guide
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Women’s EU size guide</DialogTitle>
          <DialogDescription>Measure from the back of your heel to the longest toe, then choose the closest EU size. Choose the larger size if you are between measurements.</DialogDescription>
        </DialogHeader>
        <div className="overflow-x-auto border">
          <table className="w-full min-w-[520px] border-collapse text-left text-sm">
            <caption className="sr-only">Women’s shoe size conversion chart</caption>
            <thead className="bg-muted/60"><tr>{['EU Size', 'UK Size', 'India Size', 'Foot Length (cm)'].map((heading) => <th key={heading} scope="col" className="border-b px-4 py-3 font-semibold">{heading}</th>)}</tr></thead>
            <tbody>{WOMEN_SHOE_SIZE_ROWS.map(({ eu, uk, india, footLength }) => <tr key={eu} className="border-b last:border-b-0"><th scope="row" className="px-4 py-3 font-semibold">{eu}</th><td className="px-4 py-3">{uk}</td><td className="px-4 py-3">{india}</td><td className="px-4 py-3">{footLength}</td></tr>)}</tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
