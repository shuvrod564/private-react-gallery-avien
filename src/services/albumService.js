import { createTaxonomyService } from './taxonomyService';

export const albumService = createTaxonomyService({
  table: 'albums',
  rpcTable: 'albums',
  entityName: 'Album',
  fields: ['description', 'cover_image_id'],
});
