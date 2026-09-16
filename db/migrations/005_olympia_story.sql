-- 005: news_posts gets an optional hero image; replace the mis-dated Labor Day
-- post (drone camera clock was a year off) with the Olympia / Budd Inlet Six story.

ALTER TABLE news_posts ADD COLUMN image VARCHAR(120) NULL AFTER body;

DELETE FROM news_posts WHERE slug = 'labor-day-2025';

INSERT INTO news_posts (slug, published_on, title, body, image) VALUES
('olympia-budd-inlet-2026', '2026-09-08',
 'A week''s notice, fouled anchors and a thousand volunteer hours: Comanche''s run to Olympia',
 'When the Olympia Arts & Heritage Alliance called in late August, they asked a simple question: could Comanche be in Olympia in about a week? AHA was planning the Budd Inlet Six Commemorative Cruise for Saturday, September 5 — an invitation-only program revisiting the 1976 capture and release of six orcas in Budd Inlet, the event that helped turn public understanding of orcas from animals to be caught and displayed into intelligent, social, wild beings deserving protection, and contributed to the end of live captures in Washington and U.S. waters. They wanted the program to happen on the water where it happened. We said yes.

Saying yes meant getting an 82-year-old tug off her anchors first. Comanche had been lying to two anchors near Port Hadlock, and the chains had fouled into a doozy of a tangle. What should have been a morning''s work turned into four days straight of heaving, clearing, re-leading and heaving again, with the all-volunteer crew working long hours day in and day out. By the time both anchors were on deck the crew had put in something close to a thousand hours of work in a week.

On September 1 she got underway, loud and proud and drawing a crowd, with a sendoff from friends afloat. First stop was Tacoma. On September 2 she threaded the Tacoma Narrows in thick fog — the Narrows Bridge a gray ghost overhead, the bow light and the ensign the only color in the world — and pushed on to Olympia, tying up on the north side of the outer breakwater dock at Swantown Marina.

Friday was all hands: final cleaning, setting up the fantail, a tune-up on the main 278 and a list of smaller projects, with lunch donated by a Comanche supporter for everyone who reported by ten. Saturday, in clean jeans and blue and white collared shirts, the crew welcomed AHA''s Orca Members, speakers and guests aboard for the commemorative cruise — a nonprofit-to-nonprofit mission-support collaboration that put maritime history, conservation history and community storytelling together on Budd Inlet. Sunday, Captain Dale took the crew, volunteers and friends of Comanche out for a slow thank-you cruise.

Thank you to everyone who made it happen: Quinn Adcock, Sean Kilkenny, Sophia Mitchell Kilkenny, Mac McCune, Max Madern, Rick Nicholson, Andy Hough, John Hansen, Jon Salzman, Tim Cedeno, Richard Stroud, David Gaube, Sylver Stone, and every volunteer who showed up at Swantown with a good attitude and closed-toed shoes. This is what "we partner on missions" looks like — and what a thousand volunteer hours can do on a week''s notice.',
 'underway-quarter')
ON DUPLICATE KEY UPDATE published_on = VALUES(published_on), title = VALUES(title), body = VALUES(body), image = VALUES(image);
