import { AdminTaxonomy } from '../../components/admin/AdminTaxonomy';
import { tagService } from '../../services/tagService';
import { tagSchema } from '../../schemas/taxonomySchemas';

export default function AdminTags() {
  return (
    <AdminTaxonomy title="Tags" entityName="Tag" service={tagService} schema={tagSchema} />
  );
}
