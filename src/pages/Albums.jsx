import { TaxonomyIndex } from '../components/taxonomy/TaxonomyIndex';
import { albumService } from '../services/albumService';

export default function Albums() {
  return (
    <TaxonomyIndex
      title="Albums"
      description="Curated collections of photographs."
      service={albumService}
      routePrefix="albums"
      entityName="Album"
      metaDescription="Browse all curated photo albums."
    />
  );
}
