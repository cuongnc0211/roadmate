-- Phase 06 — keep profiles.rating_avg in sync when a review is written.
create function update_rating_avg()
  returns trigger
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
begin
  update profiles
    set rating_avg = coalesce(
      (select round(avg(rating)::numeric, 2) from reviews where to_user = new.to_user),
      0
    )
    where id = new.to_user;
  return new;
end;
$$;

create trigger on_review_insert
  after insert on reviews
  for each row execute function update_rating_avg();
