import { TaxonomyDetail } from '../components/taxonomy/TaxonomyDetail';
import { tagService } from '../services/tagService';

export default function TagDetails() {
  return (
    <TaxonomyDetail
      service={tagService}
      routePrefix="tag"
      entityName="Tags"
      singular="Tag"
      field="tag"
    />
  );
}
