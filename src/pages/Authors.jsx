import { TaxonomyIndex } from '../components/taxonomy/TaxonomyIndex';
import { authorService } from '../services/authorService';

export default function Authors() {
  return (
    <TaxonomyIndex
      title="Authors"
      description="The photographers behind the collection."
      service={authorService}
      routePrefix="authors"
      entityName="Author"
      metaDescription="Browse all photographers and authors."
    />
  );
}
