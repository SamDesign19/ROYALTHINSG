-- TEST ONLY helpers.
create schema test;
grant usage on schema test to anon, authenticated;

create function test.ok(cond boolean, label text) returns text language plpgsql as $$
begin
  if cond is distinct from true then
    raise exception 'FAIL: %', label;
  end if;
  raise notice 'ok - %', label;
  return 'ok';
end $$;

-- Runs a statement and checks that it fails with a message containing `expected`.
create function test.raises(stmt text, expected text, label text) returns text language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    if position(expected in sqlerrm) > 0 then
      raise notice 'ok - % (%)', label, sqlerrm;
      return 'ok';
    end if;
    raise exception 'FAIL: % — expected "%", got "%"', label, expected, sqlerrm;
  end;
  raise exception 'FAIL: % — statement succeeded, expected "%"', label, expected;
end $$;

create function test.login(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', coalesce(uid::text, ''), false);
$$;
grant execute on all functions in schema test to anon, authenticated;
