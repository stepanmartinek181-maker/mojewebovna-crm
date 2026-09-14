# MojeWebovna CRM

Jednoduché české webové CRM pro oslovování firem. React + Vite + Supabase Auth a PostgreSQL. Veřejný kód ani hotová stránka neobsahují zákaznické kontakty. Přihlas se stejným e-mailem na počítači i mobilu. Jednorázový odkaz otevři na zařízení, které chceš přihlásit. Původní lokální kontakty přenese tlačítko **Přenést kontakty**, originál zůstane zachovaný.

## Používání

- **Volal jsem** → datum hovoru, výsledek, poznámka, datum a čas dalšího kontaktu.
- **Název firmy** → důvod zařazení, původní zdroj, editace a historie.
- **K zavolání** → nearchivované kontakty s termínem, který právě nastal nebo už uplynul. Budoucí termíny jsou v Kontaktech; lze řadit podle termínu.
- **Nekontaktovat** → zruší další termín a vypne tlačítko hovoru. Archivace je vratná a nemaže historii.
- **Záloha dat** → kompletní JSON včetně historie, slučovací import, CSV kontaktů pro Excel. CSV není úplná záloha historie.

## Důležité: kde jsou data

Data jsou v soukromé databázi Supabase. PostgreSQL Row Level Security vynucuje přístup jen k vlastnímu účtu (`auth.uid() = user_id`); anonymní přístup je zakázán. Změny se potvrzují po zápisu do databáze. Otevřená aplikace načítá změny každých 5 sekund a při návratu do okna. Každý zápis kontroluje revizi (compare-and-swap); při konfliktu se operace znovu aplikuje na aktuální dokument. Zastaralá editace je odmítnuta. Stejný opakovaný hovor se neduplikuje.

Bez internetu lze vidět místní kopii po ověření relace, ale změny se offline neřadí do fronty. Neúspěšné uložení ponechá formulář otevřený. Zavření nebo obnovení stránky může ztratit rozepsaný formulář. Při výpadku po odeslání může být výsledek nejistý; zkontroluj historii. Pravidelně exportuj vlastní JSON zálohu. Přihlášení a kopie dat jsou v úložišti prohlížeče; nesdílej jeho profil s cizími lidmi. Odhlášení ukončí relaci na tomto zařízení a skryje CRM, ale nemaže místní zálohy ani původní kontakty. Jiný účet má oddělená data, nejde o týmové sdílení.

Připomínky jsou viditelné uvnitř aplikace, **neposílají systémové notifikace, SMS ani e-maily**. Telefonní a e-mailový odkaz pouze otevře příslušnou aplikaci. CRM samo nikoho neoslovuje.

Import kontroluje schéma a duplicitní ID. Sloučí kontakty, zachová novější metadata a spojí historii podle ID hovorů. Před importem stáhni aktuální zálohu. Importovaná data se uloží do přihlášeného účtu.

## O importovaných kontaktech

Web nenalezen není důkaz, že firma web nemá. Technické nedostatky nejsou potvrzená poptávka. Pracovní inzeráty často hledají zaměstnance, nikoli externí agenturu. Před oslovením ověř aktuálnost zdroje a vhodnost nabídky. Obsah formulářů zůstává textem, není vykonáván jako HTML; externí zdroje dovolují jen HTTP/HTTPS.

## Spuštění hotového balíčku na tomto Macu

Otevři `Spustit CRM.command` a v prohlížeči adresu **http://127.0.0.1:4173**. Balíček obsahuje hotový `dist/`; k běhu stačí Node.js 22.12+. Spouštěč využije běžně nainstalovaný Node, případně stávající runtime Codexu na tomto Macu. Server naslouchá jen na tomto počítači. Terminál musí zůstat otevřený.

## Vývoj a build

Node.js >=22.12, pnpm (projekt ověřen s pnpm 11).

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm build
node serve.mjs
```

`pnpm dev` spouští `index-dev.html` na portu 5173, lokální balíček používá port 4173. Přihlašovací odkaz se vrací na produkční adresu; místní přihlášení vyžaduje samostatně schválený redirect pro vývoj. Nesdílej produkční relace v testech. `pnpm build` vytvoří samostatný `index.html` s vloženým JS/CSS a CSP hashem; tento soubor je verzován pro publikování z main.

## GitHub a online verze

Repozitář obsahuje pouze aplikaci, nikoli uživatelská data. GitHub Pages může publikovat připravený `index.html` z větve `main`, složky `/ (root)`. Po změně zdrojů spusť build a commitni i přegenerovaný `index.html`.

Prázdný `seed.json` je záměrný: **kdo může stáhnout web, může číst jeho kód**. Nikdy sem nepřidávej kontakty, zálohy, soukromé poznámky, hesla ani service-role klíče. Veřejný publishable klíč v `cloud.js` není administrátorský; ochranu vynucuje databáze. [Nastavení GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

`schema.sql` jednorázově zakládá tabulku, práva a RLS. Nespouštěj ho opakovaně jako obnovu. V Supabase nastav Site URL na přesnou HTTPS adresu CRM. Při změně projektu uprav `cloud.js`, CSP v `index-dev.html` a návrat přihlášení v `Auth.jsx`. Dokument má limit přibližně 4,5 MB; pro větší evidenci bude vhodné rozdělení na řádky kontaktů a hovorů. Tarif spravuje vlastník projektu.

## Testy

`pnpm test` kontroluje seed, hovory, termíny, uzavřené stavy, vyhledávání, archivaci, zálohy, bezpečné odkazy a CSV, souběžný zápis, první vložení a síťové chyby. Cloudové unit testy používají simulovaný server a nenahrazují živý test RLS a dvou přihlášených zařízení.
