import { AdminTaxonomy } from '../../components/admin/AdminTaxonomy';
import { authorService } from '../../services/authorService';
import { authorSchema } from '../../schemas/taxonomySchemas';

export default function AdminAuthors() {
  return (
    <AdminTaxonomy title="Authors" entityName="Author" service={authorService} schema={authorSchema} />
  );
}
