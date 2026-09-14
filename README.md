# MojeWebovna CRM

Jednoduché české webové CRM pro oslovování firem. React + Vite, bez účtu. Veřejný kód ani hotová stránka neobsahují zákaznické kontakty. Každý prohlížeč začíná s prázdnou evidencí, kterou lze naplnit ručně nebo importem vlastní JSON zálohy.

## Používání

- **Volal jsem** → datum hovoru, výsledek, poznámka, datum a čas dalšího kontaktu.
- **Název firmy** → důvod zařazení, původní zdroj, editace a historie.
- **K zavolání** → nearchivované kontakty s termínem, který právě nastal nebo už uplynul. Budoucí termíny jsou v Kontaktech; lze řadit podle termínu.
- **Nekontaktovat** → zruší další termín a vypne tlačítko hovoru. Archivace je vratná a nemaže historii.
- **Záloha dat** → kompletní JSON včetně historie, slučovací import, CSV kontaktů pro Excel. CSV není úplná záloha historie.

## Důležité: kde jsou data

Tato první verze je **local-first**: data zůstávají v localStorage konkrétního prohlížeče na konkrétní adrese. Nejsou na GitHubu ani na serveru a nesynchronizují se mezi zařízeními. Jiný prohlížeč, jiná adresa, jiný port nebo anonymní režim mají samostatná data. Změny potvrzuje aplikace až po úspěšném zápisu. Smazání dat prohlížeče může smazat CRM — pravidelně exportuj JSON.

Připomínky jsou viditelné uvnitř aplikace, **neposílají systémové notifikace, SMS ani e-maily**. Telefonní a e-mailový odkaz pouze otevře příslušnou aplikaci. CRM samo nikoho neoslovuje.

Import kontroluje schéma a duplicitní ID. Sloučí kontakty, zachová novější metadata a spojí historii podle ID hovorů. Jde o ruční přenos záloh, nikoli o týmovou synchronizaci. Před importem stáhni aktuální zálohu. Při poškozených lokálních datech aplikace nic automaticky nepřepisuje a nabídne záchrannou kopii.

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

`pnpm dev` spouští vývojovou stránku `index-dev.html` na portu 5173. Produkční lokální balíček používá port 4173. Data z vývojového originu se automaticky nepřenášejí do produkčního; použij JSON export/import. Zdrojové moduly jsou vedle konfigurace v kořeni projektu. `pnpm build` vytvoří samostatný `index.html` s vloženým JS/CSS a CSP hashem; tento soubor je záměrně verzován, aby šel web publikovat přímo z větve main bez přístupových klíčů.

## GitHub a online verze

Repozitář obsahuje pouze aplikaci, nikoli uživatelská data. GitHub Pages může publikovat připravený `index.html` z větve `main`, složky `/ (root)`. Po změně zdrojů spusť build a commitni i přegenerovaný `index.html`.

Prázdný `seed.json` je záměrný: **kdo může stáhnout web, může číst jeho kód**. Nikdy sem nepřidávej kontakty, zálohy, soukromé poznámky ani přístupové klíče. Uživatelské záznamy se ukládají výhradně lokálně a při buildu se nečtou. Soubor `index.html` lze hostovat i na jiném statickém HTTPS hostingu. [Nastavení GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

Pro sdílenou práci na mobilu a počítači bude další krok přihlášení + serverová databáze s pravidly přístupu. Statický hosting sám tuto synchronizaci nezajišťuje.

## Testy

`pnpm test` kontroluje seed, zápis a chronologii hovorů, platnost dat, uzavřené stavy, frontu připomínek, vyhledávání, archivaci, validaci a sloučení záloh, bezpečné odkazy a ochranu CSV před formulí. Primární průchod je ověřován také v reálném prohlížeči.
