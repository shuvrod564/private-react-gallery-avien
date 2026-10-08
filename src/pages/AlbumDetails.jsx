import { TaxonomyDetail } from '../components/taxonomy/TaxonomyDetail';
import { albumService } from '../services/albumService';

export default function AlbumDetails() {
  return (
    <TaxonomyDetail
      service={albumService}
      routePrefix="albums"
      entityName="Albums"
      singular="Album"
      field="album"
    />
  );
}
