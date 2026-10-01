-- Lets the app run its SQL over HTTPS (Supabase's REST API) instead of a direct database connection.
-- Only the service_role key can call it; the public anon key cannot.
create or replace function public.hundred_exec(query text, params jsonb default '[]'::jsonb)
returns json
language plpgsql
security definer
set search_path = public
as $fn$
declare
  parts text[];
  idx int[];
  q text;
  i int;
  lit text;
  result json;
  returns_rows boolean;
begin
  -- Fill $1, $2 … in a single pass, so a value that happens to contain "$2" is left alone.
  parts := regexp_split_to_array(query, '\$[0-9]+');
  idx := array(select (m)[1]::int from regexp_matches(query, '\$([0-9]+)', 'g') as m);
  q := parts[1];
  for i in 1 .. coalesce(array_length(idx, 1), 0) loop
    if idx[i] < 1 or idx[i] > jsonb_array_length(params) then
      raise exception 'parameter $% was not supplied', idx[i];
    end if;
    if jsonb_typeof(params -> (idx[i] - 1)) = 'null' then
      lit := 'NULL';
    else
      lit := quote_literal(params ->> (idx[i] - 1));
    end if;
    q := q || lit || parts[i + 1];
  end loop;

  -- Decided on the query text before values go in, so a value containing the word "returning" can't confuse it.
  returns_rows := query ~* '^\s*(select|with)\M' or query ~* '\mreturning\M';
  if returns_rows then
    execute 'with t as (' || q || ') select coalesce(json_agg(t), ''[]''::json) from t' into result;
  else
    execute q;
    result := '[]'::json;
  end if;
  return result;
end
$fn$;

revoke all on function public.hundred_exec(text, jsonb) from public, anon, authenticated;
grant execute on function public.hundred_exec(text, jsonb) to service_role;
