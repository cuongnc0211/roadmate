-- RoadMate seed — corridor Hoà Lạc ↔ Hà Nội + 12 pickup nodes.
-- Runs after migrations on `supabase db reset`.
-- sort 1..5 = the 5 launch nodes (điểm nổ) for the density-compression GTM:
--   demand (KTX): ĐHQG, HV Tài chính, ĐH FPT
--   supply (văn phòng có ô tô/ghế thừa): F-Ville, Viettel Hoà Lạc

insert into corridors (id, name)
values ('00000000-0000-0000-0000-000000000001', 'Hoà Lạc ↔ Hà Nội')
on conflict (id) do nothing;

insert into points (name, zone, corridor_id, sort) values
  -- Hoà Lạc — 5 điểm nổ (sort 1..5)
  ('KTX ĐH Quốc Gia',        'HL', '00000000-0000-0000-0000-000000000001', 1),
  ('KTX Học viện Tài chính', 'HL', '00000000-0000-0000-0000-000000000001', 2),
  ('KTX ĐH FPT',             'HL', '00000000-0000-0000-0000-000000000001', 3),
  ('F-Ville (FPT Software)', 'HL', '00000000-0000-0000-0000-000000000001', 4),
  ('Viettel Hoà Lạc',        'HL', '00000000-0000-0000-0000-000000000001', 5),
  -- Hoà Lạc — điểm phụ
  ('Cổng Khu CNC Hoà Lạc',   'HL', '00000000-0000-0000-0000-000000000001', 6),
  -- Hà Nội
  ('Big C Thăng Long',       'HN', '00000000-0000-0000-0000-000000000001', 7),
  ('Cầu Giấy',               'HN', '00000000-0000-0000-0000-000000000001', 8),
  ('Mỹ Đình',                'HN', '00000000-0000-0000-0000-000000000001', 9),
  ('Kim Mã',                 'HN', '00000000-0000-0000-0000-000000000001', 10),
  ('Bách Khoa',              'HN', '00000000-0000-0000-0000-000000000001', 11),
  ('Hồ Gươm',                'HN', '00000000-0000-0000-0000-000000000001', 12);
