-- 更新或重設觀展場次時段 (ticket_slots)
-- 採用 ON CONFLICT 覆寫，確保現有測試票券的外鍵關聯不被 cascade 破壞

INSERT INTO public.ticket_slots (id, date_str, name_zh, name_en, time_range, max_tickets, booked_tickets) VALUES
('slot_1', '2027/1/8 (五)', '午後漫遊場(I)', 'Afternoon Stroll (I)', '12:00 - 15:00', 60, 0),
('slot_2', '2027/1/8 (五)', '午後漫遊場(II)', 'Afternoon Stroll (II)', '15:00 - 18:00', 60, 0),
('slot_3', '2027/1/9 (六)', '午後漫遊場(I)', 'Afternoon Stroll (I)', '12:00 - 15:00', 60, 0),
('slot_4', '2027/1/9 (六)', '午後漫遊場(II)', 'Afternoon Stroll (II)', '15:00 - 18:00', 60, 0),
('slot_5', '2027/1/9 (六)', '星光探索場(I)', 'Starlight Exploration (I)', '18:00 - 20:00', 60, 0)
ON CONFLICT (id) DO UPDATE SET
    date_str = EXCLUDED.date_str,
    name_zh = EXCLUDED.name_zh,
    name_en = EXCLUDED.name_en,
    time_range = EXCLUDED.time_range,
    max_tickets = EXCLUDED.max_tickets;

-- 清理任何多餘的時段（若有的話）
DELETE FROM public.ticket_slots WHERE id NOT IN ('slot_1', 'slot_2', 'slot_3', 'slot_4', 'slot_5');
