import { TaxonomyDetail } from '../components/taxonomy/TaxonomyDetail';
import { authorService } from '../services/authorService';

export default function AuthorDetails() {
  return (
    <TaxonomyDetail
      service={authorService}
      routePrefix="author"
      entityName="Authors"
      singular="Author"
      field="author"
    />
  );
}
