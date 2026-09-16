-- 002: seed the news table with the same posts bundled in the frontend so
-- the live page matches the fallback on day one. INSERT IGNORE keeps this
-- re-runnable.

INSERT IGNORE INTO news_posts (slug, published_on, title, body) VALUES
('labor-day-2025', '2025-09-01', 'Comanche joins the Labor Day raft-up',
 'Comanche got underway with her volunteer crew for a Labor Day weekend gathering of historic vessels on Puget Sound, rafting alongside friends and welcoming visitors on deck. Drone footage from the day now anchors this website.'),
('cod-renewed-2025', '2025-08-27', 'Certificate of Documentation renewed through 2030',
 'The U.S. Coast Guard issued a renewed Certificate of Documentation for Comanche (Official Number 647250), valid through August 31, 2030.'),
('liberty-bay-2025', '2025-05-01', 'Liberty Bay sewage spill delays departure',
 'A 15,000-gallon sewage spill in Liberty Bay forced the all-volunteer crew to delay a planned departure from Poulsbo, as handling the anchor chain would have meant direct contact with contaminated water. The Foundation met with the community at Oyster Plant Park to discuss the health of shared waters.');
