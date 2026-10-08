import { AdminTaxonomy } from '../../components/admin/AdminTaxonomy';
import { albumService } from '../../services/albumService';
import { albumSchema } from '../../schemas/taxonomySchemas';

export default function AdminAlbums() {
  return (
    <AdminTaxonomy title="Albums" entityName="Album" service={albumService} schema={albumSchema} />
  );
}
