import { TaxonomyIndex } from '../components/taxonomy/TaxonomyIndex';
import { tagService } from '../services/tagService';

export default function Tags() {
  return (
    <TaxonomyIndex
      title="Tags"
      description="Explore images by tag."
      service={tagService}
      routePrefix="tags"
      entityName="Tag"
      metaDescription="Browse all image tags."
    />
  );
}
