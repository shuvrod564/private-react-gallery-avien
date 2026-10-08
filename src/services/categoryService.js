import { createTaxonomyService } from './taxonomyService';

export const categoryService = createTaxonomyService({
  table: 'categories',
  rpcTable: 'categories',
  entityName: 'Category',
  fields: ['description', 'cover_image_id'],
});
