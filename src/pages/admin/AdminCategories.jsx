import { AdminTaxonomy } from '../../components/admin/AdminTaxonomy';
import { categoryService } from '../../services/categoryService';
import { categorySchema } from '../../schemas/taxonomySchemas';

export default function AdminCategories() {
  return (
    <AdminTaxonomy title="Categories" entityName="Category" service={categoryService} schema={categorySchema} />
  );
}
