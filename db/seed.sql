-- RoadMate seed — corridor Hoà Lạc ↔ Hà Nội + 12 pickup nodes.
-- Idempotent: safe to re-run (`pnpm db:seed`).
-- sort 1..5 = the 5 launch nodes (điểm nổ) for the density-compression GTM:
--   demand (KTX): ĐHQG, HV Tài chính, ĐH FPT
--   supply (văn phòng có ô tô/ghế thừa): F-Ville, Viettel Hoà Lạc

insert into corridors (id, name)
values ('00000000-0000-0000-0000-000000000001', 'Hoà Lạc ↔ Hà Nội')
on conflict (id) do nothing;

insert into points (name, zone, corridor_id, sort)
select v.name, v.zone::zone, '00000000-0000-0000-0000-000000000001', v.sort
from (values
  -- Hoà Lạc — 5 điểm nổ (sort 1..5)
  ('KTX ĐH Quốc Gia',        'HL', 1),
  ('KTX Học viện Tài chính', 'HL', 2),
  ('KTX ĐH FPT',             'HL', 3),
  ('F-Ville (FPT Software)', 'HL', 4),
  ('Viettel Hoà Lạc',        'HL', 5),
  -- Hoà Lạc — điểm phụ
  ('Cổng Khu CNC Hoà Lạc',   'HL', 6),
  -- Hà Nội
  ('Big C Thăng Long',       'HN', 7),
  ('Cầu Giấy',               'HN', 8),
  ('Mỹ Đình',                'HN', 9),
  ('Kim Mã',                 'HN', 10),
  ('Bách Khoa',              'HN', 11),
  ('Hồ Gươm',                'HN', 12)
) as v (name, zone, sort)
where not exists (select 1 from points p where p.name = v.name);
