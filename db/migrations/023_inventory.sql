-- 023: ship's inventory. Built for a volunteer standing in the lazarette with
-- a phone: photograph the shelf, the bin, the packaging and the part itself,
-- and type as little as possible.

-- A third kind of portal account: someone who works the inventory and has no
-- business in the contacts, mail or receipts.
ALTER TABLE users MODIFY role ENUM('admin','editor','inventory') NOT NULL DEFAULT 'editor';

CREATE TABLE IF NOT EXISTS inventory_items (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(200) NOT NULL,
  part_number    VARCHAR(120) NOT NULL DEFAULT '',
  manufacturer   VARCHAR(120) NOT NULL DEFAULT '',

  qty            INT NOT NULL DEFAULT 1,
  unit           VARCHAR(24) NOT NULL DEFAULT 'each',      -- each, ft, gal, box, set
  min_qty        INT NOT NULL DEFAULT 0,                   -- tell us when it drops below this

  ship_system    VARCHAR(120) NOT NULL DEFAULT '',         -- main engine, 671 gen set, deck, electrical…
  location       VARCHAR(200) NOT NULL DEFAULT '',         -- "lazarette, port shelf 3"
  container_type VARCHAR(80)  NOT NULL DEFAULT '',         -- bin, crate, tote, locker, pallet, shelf
  container_id   VARCHAR(80)  NOT NULL DEFAULT '',         -- "Bin A-14"

  cond           ENUM('new','used-good','serviceable','needs-repair','scrap','unknown') NOT NULL DEFAULT 'unknown',
  status         ENUM('active','low','used-up','disposed') NOT NULL DEFAULT 'active',
  tags           VARCHAR(300) NOT NULL DEFAULT '',         -- comma list

  vendor         VARCHAR(160) NOT NULL DEFAULT '',
  order_url      VARCHAR(600) NOT NULL DEFAULT '',         -- where to buy another
  alt_order_url  VARCHAR(600) NOT NULL DEFAULT '',         -- second source / substitute
  price          DECIMAL(10,2) NULL,
  order_notes    VARCHAR(600) NOT NULL DEFAULT '',

  -- Hooks for the procedures library, which does not exist yet.
  procedure_ref  VARCHAR(200) NOT NULL DEFAULT '',         -- "Change the port main fuel filter"
  procedure_url  VARCHAR(600) NOT NULL DEFAULT '',
  procedure_id   INT UNSIGNED NULL,                        -- FK once procedures land

  notes          TEXT NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by     INT UNSIGNED NULL,
  updated_by     INT UNSIGNED NULL,

  INDEX idx_name (name),
  INDEX idx_part (part_number),
  INDEX idx_system (ship_system),
  INDEX idx_location (location),
  INDEX idx_status (status),
  FULLTEXT KEY ft_search (name, part_number, manufacturer, ship_system, location, container_id, tags, notes)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Photos, filed by what they show. Downscaled in the browser before upload —
-- the server has 900 MB of RAM and no business resizing images.
CREATE TABLE IF NOT EXISTS inventory_photos (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  item_id     INT UNSIGNED NOT NULL,
  kind        ENUM('location','container','packaging','part','label','other') NOT NULL DEFAULT 'part',
  file        VARCHAR(160) NOT NULL,                       -- name on disk
  caption     VARCHAR(200) NOT NULL DEFAULT '',
  bytes       INT UNSIGNED NOT NULL DEFAULT 0,
  sort        SMALLINT NOT NULL DEFAULT 0,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by  INT UNSIGNED NULL,
  INDEX idx_item (item_id, kind, sort),
  CONSTRAINT fk_photo_item FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Every movement, so a count that looks wrong can be traced.
CREATE TABLE IF NOT EXISTS inventory_moves (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  item_id    INT UNSIGNED NOT NULL,
  delta      INT NOT NULL,
  qty_after  INT NOT NULL,
  reason     VARCHAR(200) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by INT UNSIGNED NULL,
  INDEX idx_item (item_id, created_at),
  CONSTRAINT fk_move_item FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
