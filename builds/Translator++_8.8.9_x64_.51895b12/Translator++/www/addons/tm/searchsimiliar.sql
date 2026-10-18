// keyword: makan apel
// length: 2



WITH keywords(word) AS (
	VALUES 
	("makan"),
	("apel")
), 
filtered AS (
  SELECT *,
	MATCH(searchable)
	AGAINST("makan apel" IN NATURAL LANGUAGE MODE)
	AS score
  FROM en_en
  WHERE
	MATCH(searchable)
	AGAINST("makan apel" IN NATURAL LANGUAGE MODE)
)
SELECT 
    keywords.*,
	filtered.*,
	COUNT(filtered.original) AS hit, 
	(ABS(filtered.wordcount - 2) + ABS(COUNT(filtered.original) - 2)) AS dif
FROM keywords
LEFT JOIN filtered 
ON (filtered.searchable LIKE concat('%',keywords.word,'%'))
GROUP BY filtered.original;



WITH tablelist(tablename) AS (
    SHOW FULL COLUMNS FROM `en_en`
)
SELECT * FROM tablelist