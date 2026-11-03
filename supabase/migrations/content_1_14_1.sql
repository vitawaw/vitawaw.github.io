-- VITAWAW 1.14.1 (owner: «نفذ النقطتين»): every source gets an explicit type (kind), so the type chips on the sources page
-- are exact and no longer guessed from the organisation name. Four types are corrected:
--   77 → c (clinical reference), 78 → s (study), 22 → g (clinical guideline), 38 → o (official reference).
-- Trusted SQL (no signed-in user): the review state and the stamp stay as they are. A pending pharmacist version waiting
-- for approval (pub) gets the same type, so publishing never brings the old type back.
-- Reaches visitors when the owner publishes. Safe to run twice.
with m(id, k) as (values
  (2,'g'),(3,'g'),(5,'g'),(14,'g'),(22,'g'),(51,'g'),(52,'g'),(53,'g'),(54,'g'),(55,'g'),(56,'g'),(57,'g'),(58,'g'),(61,'g'),(62,'g'),(67,'g'),(68,'g'),(69,'g'),(70,'g'),(76,'g'),
  (4,'o'),(8,'o'),(11,'o'),(15,'o'),(18,'o'),(20,'o'),(23,'o'),(25,'o'),(29,'o'),(30,'o'),(31,'o'),(32,'o'),(33,'o'),(34,'o'),(35,'o'),(36,'o'),(37,'o'),(38,'o'),
  (39,'o'),(40,'o'),(41,'o'),(42,'o'),(43,'o'),(44,'o'),(46,'o'),(47,'o'),(48,'o'),(49,'o'),(50,'o'),(65,'o'),(71,'o'),
  (16,'d'),(17,'d'),(27,'d'),(28,'d'),(45,'d'),(59,'d'),(60,'d'),(66,'d'),(72,'d'),(73,'d'),(74,'d'),(75,'d'),
  (13,'s'),(19,'s'),(24,'s'),(26,'s'),(63,'s'),(64,'s'),(78,'s'),
  (21,'c'),(77,'c'))
update public.sources s
   set kind = m.k,
       pub = case when s.pub is not null then jsonb_set(s.pub, '{kind}', to_jsonb(m.k)) end
  from m
 where s.id = m.id and (s.kind is distinct from m.k or (s.pub is not null and s.pub->>'kind' is distinct from m.k));
