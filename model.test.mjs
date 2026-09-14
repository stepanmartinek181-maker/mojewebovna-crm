import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  recordCall,
  due,
  filterLeads,
  validateBackup,
  mergeBackup,
  csv,
  safeUrl,
} from "./model.js";
const seed = [{id:"test-1",name:"Test kadeřnictví",phone:"",email:"",contact:"",research:"Test",source:"",note:"",category:"Web nenalezen",priority:"Střední",status:"Nevoláno",nextAt:"",calls:[],archived:false,updatedAt:"2025-01-01T00:00:00Z"}];
const data = () => ({ version: 1, leads: structuredClone(seed) });
test("Veřejný balíček neobsahuje zákaznické kontakty", () => {
  assert.deepEqual(JSON.parse(fs.readFileSync(new URL("./seed.json",import.meta.url),"utf8")), []);
  assert.ok(
    seed.every(
      (l) => l.status === "Nevoláno" && l.calls.length === 0 && !l.nextAt,
    ),
  );
  validateBackup(data());
  assert.equal(new Set(seed.map((l) => l.id)).size, 1);
});
test("hovor uloží historii, výsledek a připomínku", () => {
  const l = recordCall(seed[0], {
    at: "2026-01-01T10:00",
    status: "Má zájem",
    note: " Poslat návrh ",
    nextAt: "2026-01-03T11:00",
  });
  assert.equal(l.calls.length, 1);
  assert.equal(l.status, "Má zájem");
  assert.equal(l.calls[0].note, "Poslat návrh");
  assert.ok(due(l, new Date("2026-01-04")));
  assert.ok(!due(l, new Date("2026-01-02")));
});
test("odmítnutí a nekontaktovat zruší termín i frontu", () => {
  for (const status of [
    "Nemá zájem",
    "Nekontaktovat",
    "Domluvená spolupráce",
  ]) {
    const l = recordCall(seed[0], {
      at: "2026-01-01T10:00",
      status,
      note: "",
      nextAt: "2026-01-03T11:00",
    });
    assert.equal(l.nextAt, "");
    assert.ok(!due(l, new Date("2026-02-01")));
  }
});
test("starší dopsaný hovor nemění novější výsledek", () => {
  let l = recordCall(seed[0], {
    at: "2026-01-03T10:00",
    status: "Má zájem",
    note: "",
    nextAt: "",
  });
  l = recordCall(l, {
    at: "2026-01-01T10:00",
    status: "Nedovolal jsem se",
    note: "",
    nextAt: "",
  });
  assert.equal(l.status, "Má zájem");
  assert.equal(l.calls.length, 2);
});
test("neplatná a budoucí data jsou odmítnuta", () => {
  for (const at of ["", "bad", "2999-01-01T10:00"])
    assert.throws(() =>
      recordCall(seed[0], { at, status: "Má zájem", note: "", nextAt: "" }),
    );
  assert.throws(() =>
    recordCall(seed[0], {
      at: "2026-01-04",
      status: "Má zájem",
      note: "",
      nextAt: "2026-01-01",
    }),
  );
});
test("hledání ignoruje diakritiku, filtry a archiv fungují", () => {
  assert.equal(filterLeads(seed, { query: "kadernictvi" }).length, 1);
  assert.equal(filterLeads(seed, { category: "Web nenalezen" }).length, 1);
  assert.equal(filterLeads(seed, { view: "due" }).length, 0);
  assert.equal(filterLeads([{ ...seed[0], archived: true }], {}).length, 0);
  assert.equal(
    filterLeads([{ ...seed[0], archived: true }], { view: "archive" }).length,
    1,
  );
});
test("JSON roundtrip a slučování jsou bezztrátové a idempotentní", () => {
  const original = data();
  const incoming = data();
  incoming.leads[0] = recordCall(incoming.leads[0], {
    at: "2026-01-01",
    status: "Má zájem",
    note: "Test",
    nextAt: "",
  });
  const merged = mergeBackup(original, JSON.parse(JSON.stringify(incoming)));
  assert.equal(merged.leads[0].calls.length, 1);
  assert.deepEqual(mergeBackup(merged, incoming), merged);
  assert.equal(mergeBackup(merged, original).leads[0].status, "Má zájem");
});
test("vadné nebo duplicitní importy nemění data", () => {
  const bad = data();
  bad.leads.push(bad.leads[0]);
  assert.throws(() => validateBackup(bad));
  assert.throws(() => validateBackup({ version: 2, leads: [] }));
  const malformed = data();
  delete malformed.leads[0].calls;
  assert.throws(() => validateBackup(malformed));
});
test("export Excel chrání před CSV formulí; nebezpečné URL nejsou odkazy", () => {
  const d = data();
  d.leads[0].name = '=HYPERLINK("evil")';
  assert.ok(csv(d).includes("'=HYPERLINK"));
  assert.equal(safeUrl("javascript:alert(1)"), null);
  assert.equal(safeUrl("https://example.com"), "https://example.com/");
});
