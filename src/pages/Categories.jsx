import { TaxonomyIndex } from '../components/taxonomy/TaxonomyIndex';
import { categoryService } from '../services/categoryService';

export default function Categories() {
  return (
    <TaxonomyIndex
      title="Categories"
      description="Browse the collection by category."
      service={categoryService}
      routePrefix="category"
      entityName="Category"
      metaDescription="Browse all image categories."
    />
  );
}
