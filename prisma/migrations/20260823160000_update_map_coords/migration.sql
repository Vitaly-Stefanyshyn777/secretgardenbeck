-- Update default map pin to Yavornytskoho 57 (maps.app.goo.gl/KSiWwNZVxFtByCw36)
UPDATE "ContactSettings"
SET "mapLat" = 48.463662,
    "mapLng" = 35.046347
WHERE "id" = 'default';
