-- 008: the Sept 2025 drone photos were the Labor Day concert, not the Olympia
-- run. Restore that post with the correct date.
INSERT INTO news_posts (slug, published_on, title, body, image) VALUES
('labor-day-concert-2025', '2025-09-01', 'Labor Day concert aboard Comanche', 'Comanche spent Labor Day weekend 2025 doing what she does best: bringing people together on the water. Rafted up with friends near Port Townsend, she hosted a concert aboard with music on the fantail, a full deck of guests, and the drone overhead catching it all — her WWII camouflage on one side and her Coast Guard stripe on the other. Thanks to every volunteer who cleaned, rigged, cooked and handled lines, and to the musicians who made an 81-year-old tug the best stage on Puget Sound for a day.', 'overhead-raft')
ON DUPLICATE KEY UPDATE title = VALUES(title), body = VALUES(body), image = VALUES(image);
