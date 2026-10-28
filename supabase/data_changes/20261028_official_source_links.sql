-- Data change applied 2026-10-28 (content, not schema): link sources to the official/primary pages.
update public.sources set org='NICE NG239, 2024', url='https://www.nice.org.uk/guidance/ng239' where id=5;
update public.sources set org='American Academy of Pediatrics, Pediatrics 2026 (Guideline Central summary)',
  title='Prevention, Screening, Diagnosis, and Treatment of Iron Deficiency and Iron Deficiency Anemia in Infants, Children, and Adolescents. AAP clinical report, July 2026'
  where id=14;
