import { createTaxonomyService } from './taxonomyService';

export const tagService = createTaxonomyService({
  table: 'tags',
  rpcTable: 'tags',
  entityName: 'Tag',
  fields: [],
});
