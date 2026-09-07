import type { LocalComicEntry } from '../../types/comic';
import { ComicCard } from './ComicCard';

interface ComicGridProps {
  comics: LocalComicEntry[];
  onDelete?: (comicId: string) => void;
  deletingIds?: Set<string>;
}

export function ComicGrid({ comics, onDelete, deletingIds }: ComicGridProps) {
  return (
    <div
      className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
      role="list"
      aria-label="Comic library"
    >
      {comics.map((comic) => (
        <div key={comic.comic_id} role="listitem">
          <ComicCard
            comic={comic}
            onDelete={onDelete}
            isDeleting={deletingIds?.has(comic.comic_id)}
          />
        </div>
      ))}
    </div>
  );
}
