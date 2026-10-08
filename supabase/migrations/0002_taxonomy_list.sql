-- ============================================================================
-- Taxonomy listing (categories / tags / authors / albums)
-- Returns each entry with its published image count + a representative cover
-- image public_id. Counts only published images (spec §56).
-- ============================================================================

create or replace function public.taxonomy_list(p_table text)
returns setof jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  case p_table
    when 'tags' then
      return query
        select jsonb_build_object(
          'id', t.id,
          'name', t.name,
          'slug', t.slug,
          'image_count', (select count(distinct it.image_id)::bigint
                          from public.image_tags it
                          join public.images i on i.id = it.image_id
                          where it.tag_id = t.id and i.is_published),
          'cover_public_id', (select i.cloudinary_public_id
                              from public.image_tags it
                              join public.images i on i.id = it.image_id
                              where it.tag_id = t.id and i.is_published
                              order by i.created_at desc
                              limit 1)
        )
        from public.tags t
        order by t.name;

    when 'categories' then
      return query
        select jsonb_build_object(
          'id', t.id,
          'name', t.name,
          'slug', t.slug,
          'description', t.description,
          'image_count', (select count(*)::bigint
                          from public.images i
                          where i.is_published and i.category_id = t.id),
          'cover_public_id', (select i.cloudinary_public_id
                              from public.images i
                              where i.is_published and i.category_id = t.id
                              order by i.created_at desc
                              limit 1)
        )
        from public.categories t
        order by t.name;

    when 'authors' then
      return query
        select jsonb_build_object(
          'id', t.id,
          'name', t.name,
          'slug', t.slug,
          'bio', t.bio,
          'website_url', t.website_url,
          'avatar_url', t.avatar_url,
          'image_count', (select count(*)::bigint
                          from public.images i
                          where i.is_published and i.author_id = t.id),
          'cover_public_id', (select i.cloudinary_public_id
                              from public.images i
                              where i.is_published and i.author_id = t.id
                              order by i.created_at desc
                              limit 1)
        )
        from public.authors t
        order by t.name;

    when 'albums' then
      return query
        select jsonb_build_object(
          'id', t.id,
          'name', t.name,
          'slug', t.slug,
          'description', t.description,
          'image_count', (select count(*)::bigint
                          from public.images i
                          where i.is_published and i.album_id = t.id),
          'cover_public_id', (select i.cloudinary_public_id
                              from public.images i
                              where i.is_published and i.album_id = t.id
                              order by i.created_at desc
                              limit 1)
        )
        from public.albums t
        order by t.name;

    else
      raise exception 'Invalid taxonomy: %', p_table;
  end case;
end;
$$;

grant execute on function public.taxonomy_list(text) to anon, authenticated;
