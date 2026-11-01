from pathlib import Path
import sqlite3
db=sqlite3.connect(":memory:")
sql=Path("migrations/0001_archive.sql").read_text()
db.executescript(sql)
db.execute("INSERT INTO archive_threads(id,source_url,title,source,board,thread_date,year) VALUES (?,?,?,?,?,?,?)",("t1","https://example.com/t/1","Old Saosin discussion","Test Forum","Music","2007-04-02",2007))
db.execute("INSERT INTO archive_posts(id,thread_id,author,post_date,body) VALUES (?,?,?,?,?)",("p1","t1","Tester","2007-04-02","Recommend Saosin and The Used"))
db.execute("INSERT INTO posts_fts(body,thread_id,post_id) VALUES (?,?,?)",("Recommend Saosin and The Used","t1","p1"))
assert db.execute("SELECT post_id FROM posts_fts WHERE posts_fts MATCH ?",('"saosin"',)).fetchall()==[("p1",)]
assert db.execute("SELECT year FROM archive_threads WHERE id=?",("t1",)).fetchone()[0]==2007
print("SceneIndex D1-compatible schema and FTS5 smoke checks passed")
