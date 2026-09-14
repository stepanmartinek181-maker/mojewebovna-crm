import React, { useEffect, useRef, useState } from "react";
import {
  Users,
  Phone,
  Clock,
  Database,
  Plus,
  Search,
  X,
  Tag,
  ExternalLink,
  Download,
  Upload,
  Archive,
  Check,
  ChevronRight,
  Pencil,
} from "lucide-react";
import {
  STATUSES,
  CATEGORIES,
  PRIORITIES,
  CLOSED,
  dateLabel,
  localInput,
  due,
  safeUrl,
  recordCall,
  validateBackup,
  mergeBackup,
  csv,
  KEY,
} from "./model";
import { download } from "./store";

export function Sidebar({ view, setView, onBackup, dueCount }) {
  return (
    <aside className="sidebar">
      <a
        className="brand"
        href="#"
        onClick={(e) => {
          e.preventDefault();
          setView("contacts");
        }}
      >
        mojewebovna <span>/ CRM</span>
      </a>
      <nav aria-label="Hlavní navigace">
        {[
          ["contacts", Users, "Kontakty"],
          ["due", Phone, "K zavolání"],
          ["history", Clock, "Historie"],
          ["archive", Archive, "Archiv"],
        ].map(([id, Icon, label]) => (
          <button
            key={id}
            className={view === id ? "nav active" : "nav"}
            onClick={() => setView(id)}
            aria-current={view === id ? "page" : undefined}
          >
            <Icon />
            {label}
            {id === "due" && dueCount > 0 && (
              <span className="count">{dueCount}</span>
            )}
          </button>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <button className="nav" onClick={onBackup}>
          <Database />
          Záloha dat
        </button>
        <p>
          Data se ukládají pouze
          <br />v tomto prohlížeči.
          <br />
          Pravidelně si stáhni zálohu.
        </p>
        <span className="local-label">
          <span /> Soukromě na tomto zařízení
        </span>
      </div>
    </aside>
  );
}
export function Stats({ leads }) {
  const metrics = [
    [Users, "Kontakty", leads.filter((l) => !l.archived).length],
    [Phone, "K zavolání", leads.filter((l) => due(l)).length],
    [
      Tag,
      "Mají zájem",
      leads.filter(
        (l) =>
          !l.archived && ["Má zájem", "Nabídka odeslána"].includes(l.status),
      ).length,
    ],
  ];
  return (
    <section className="stats" aria-label="Přehled kontaktů">
      {metrics.map(([Icon, label, value]) => (
        <div className="stat" key={label}>
          <Icon size={29} />
          <div>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        </div>
      ))}
    </section>
  );
}
export function Filters({ filters, setFilters }) {
  const change = (key, value) => setFilters({ ...filters, [key]: value });
  return (
    <div className="filters">
      <div className="search">
        <Search />
        <input
          aria-label="Hledat kontakty"
          placeholder="Hledat firmu, telefon nebo poznámku"
          value={filters.query}
          onChange={(e) => change("query", e.target.value)}
        />
      </div>
      <select
        aria-label="Filtrovat podle stavu"
        value={filters.status}
        onChange={(e) => change("status", e.target.value)}
      >
        <option value="">Všechny stavy</option>
        {STATUSES.map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>
      <select
        aria-label="Filtrovat příležitosti"
        value={filters.category}
        onChange={(e) => change("category", e.target.value)}
      >
        <option value="">Všechny příležitosti</option>
        {CATEGORIES.map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>
      <select
        className="sort"
        aria-label="Řadit kontakty"
        value={filters.sort}
        onChange={(e) => change("sort", e.target.value)}
      >
        <option value="default">Výchozí pořadí</option>
        <option value="next">Podle termínu</option>
        <option value="priority">Podle priority</option>
        <option value="name">Podle názvu</option>
      </select>
    </div>
  );
}
export function Status({ value }) {
  const color = ["Má zájem", "Domluvená spolupráce"].includes(value)
    ? "green"
    : ["Nemá zájem", "Nekontaktovat"].includes(value)
      ? "red"
      : value === "Nevoláno"
        ? "gray"
        : "blue";
  return <span className={`chip ${color}`}>{value}</span>;
}
export function ContactsTable({ leads, selected, onOpen, view }) {
  if (!leads.length)
    return (
      <div className="empty">
        <Phone />
        <h2>
          {view === "due"
            ? "Teď nemáš žádný hovor po termínu"
            : "Žádné odpovídající kontakty"}
        </h2>
        <p>
          {view === "due"
            ? "Jakmile nastane uložený termín, kontakt se objeví tady. Budoucí termíny najdeš v Kontaktech."
            : "Zkus změnit filtry nebo přidej nový kontakt."}
        </p>
      </div>
    );
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Firma</th>
            <th>Příležitost</th>
            <th>Stav</th>
            <th>Další kontakt</th>
            <th>
              <span className="sr-only">Akce</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {leads.map((l) => (
            <tr key={l.id} className={selected === l.id ? "selected" : ""}>
              <td>
                <button
                  className="company"
                  onClick={() => onOpen(l.id, "detail")}
                >
                  {l.name}
                </button>
                <div className="subline">
                  {l.phone || l.email || "Kontakt zatím není vyplněný"}
                </div>
              </td>
              <td>
                <span
                  className={`chip ${l.category === "Web nenalezen" ? "amber" : l.category === "Modernizace" ? "purple" : "blue"}`}
                >
                  {l.category}
                </span>
              </td>
              <td>
                <Status value={l.status} />
              </td>
              <td className={due(l) ? "date overdue" : "date"}>
                {dateLabel(l.nextAt)}
                {due(l) && <small>Je čas se ozvat</small>}
              </td>
              <td>
                <button
                  className="button call-button"
                  disabled={l.archived || l.status === "Nekontaktovat"}
                  title={
                    l.status === "Nekontaktovat"
                      ? "Kontakt si nepřeje další oslovení"
                      : undefined
                  }
                  onClick={() => onOpen(l.id, "call")}
                  aria-label={`Volal jsem — ${l.name}`}
                >
                  <Phone size={17} />
                  <span>Volal jsem</span>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function History({ leads, onOpen }) {
  const entries = leads
    .flatMap((l) => l.calls.map((c) => ({ ...c, name: l.name, leadId: l.id })))
    .sort((a, b) => b.at.localeCompare(a.at));
  return (
    <section className="history">
      {!entries.length ? (
        <div className="empty">
          <Clock />
          <h2>První hovor teprve přijde</h2>
          <p>
            U firmy klikni na „Volal jsem“. Tady pak uvidíš celý průběh
            komunikace.
          </p>
        </div>
      ) : (
        entries.map((c) => (
          <article className="history-item" key={c.id}>
            <div className="history-icon">
              <Phone size={18} />
            </div>
            <div>
              <div className="history-title">
                <button
                  className="company"
                  onClick={() => onOpen(c.leadId, "detail")}
                >
                  {c.name}
                </button>
                <Status value={c.status} />
              </div>
              <time>{dateLabel(c.at)}</time>
              {c.note && <p className="prewrap">{c.note}</p>}
              {c.nextAt && (
                <small>Domluvený další kontakt: {dateLabel(c.nextAt)}</small>
              )}
            </div>
          </article>
        ))
      )}
    </section>
  );
}
function Modal({ children, onClose, className = "", label }) {
  const ref = useRef();
  useEffect(() => {
    const dialog = ref.current;
    const prev = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      prev?.focus?.();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={className}
      aria-label={label}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <button
        className="icon-button close"
        aria-label="Zavřít"
        onClick={onClose}
      >
        <X />
      </button>
      {children}
    </dialog>
  );
}
export function ContactDrawer({ lead, initialTab, onClose, onUpdate }) {
  const [tab, setTab] = useState(initialTab);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const close = () => {
    if (
      !dirty ||
      window.confirm("Máš rozepsané změny. Opravdu je chceš zahodit?")
    )
      onClose();
  };
  const switchTab = (t) => {
    if (!dirty || window.confirm("Zahodit rozepsané změny?")) {
      setDirty(false);
      setError("");
      setTab(t);
    }
  };
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = Object.fromEntries(new FormData(e.currentTarget));
    try {
      if (tab === "call") recordCall(lead, f);
      else if (!f.name.trim()) throw Error("Vyplň název firmy.");
      const ok = await onUpdate((current) =>
        tab === "call"
          ? recordCall(current, f)
          : {
              ...current,
              name: f.name.trim(),
              contact: f.contact.trim(),
              phone: f.phone.trim(),
              email: f.email.trim(),
              category: f.category,
              priority: f.priority,
              note: f.note.trim(),
              source: f.source.trim(),
              updatedAt: new Date().toISOString(),
            },
      );
      if (ok) {
        setDirty(false);
        onClose();
      } else
        setError(
          "Uložení se nezdařilo. Rozepsané údaje zůstaly zde. Zkontroluj dostupné místo a oprávnění úložiště.",
        );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal className="drawer" label={lead.name} onClose={close}>
      <h2>{lead.name}</h2>
      <p className="muted">
        Kontakty jsou tipy k ověření, ne potvrzené zakázky.
      </p>
      <div className="contact-links">
        {lead.phone && (
          <a href={`tel:${lead.phone.replace(/[^+\d]/g, "")}`}>
            <Phone size={19} />
            {lead.phone}
            <ExternalLink size={16} />
          </a>
        )}
        {lead.email && (
          <a href={`mailto:${encodeURIComponent(lead.email)}`}>{lead.email}</a>
        )}
      </div>
      <div className="tabs" role="group" aria-label="Detail kontaktu">
        <button
          className={tab === "call" ? "active" : ""}
          onClick={() => switchTab("call")}
          disabled={lead.archived || lead.status === "Nekontaktovat"}
        >
          Zapsat hovor
        </button>
        <button
          className={tab === "detail" ? "active" : ""}
          onClick={() => switchTab("detail")}
        >
          Přehled
        </button>
        <button
          className={tab === "edit" ? "active" : ""}
          onClick={() => switchTab("edit")}
        >
          <Pencil size={14} />
          Upravit
        </button>
      </div>
      {tab === "call" ? (
        <form onSubmit={submit} onChange={() => setDirty(true)} key="call">
          <h3>Zapsat hovor</h3>
          <label>
            Datum hovoru
            <input
              name="at"
              type="datetime-local"
              required
              max={localInput()}
              defaultValue={localInput()}
            />
          </label>
          <CallFields lead={lead} />
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="button primary full" disabled={busy}>
            {busy ? "Ukládám…" : "Uložit hovor"}
          </button>
        </form>
      ) : tab === "edit" ? (
        <form onSubmit={submit} onChange={() => setDirty(true)} key="edit">
          <h3>Upravit kontakt</h3>
          <ContactFields lead={lead} />
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="button primary full" disabled={busy}>
            Uložit změny
          </button>
        </form>
      ) : (
        <div className="detail">
          <div className="detail-summary">
            <Status value={lead.status} />
            <span>Priorita: {lead.priority}</span>
          </div>
          {lead.status === "Nekontaktovat" && (
            <p className="notice">
              Další oslovení je vypnuté. Případné obnovení vyžaduje ruční změnu
              stavu mimo tuto aplikaci.
            </p>
          )}
          <h3>Další kontakt</h3>
          <p>{dateLabel(lead.nextAt)}</p>
          {lead.contact && (
            <>
              <h3>Kontaktní osoba</h3>
              <p>{lead.contact}</p>
            </>
          )}
          {lead.note && (
            <>
              <h3>Tvoje poznámka</h3>
              <p className="prewrap">{lead.note}</p>
            </>
          )}
          <h3>Proč je firma v seznamu</h3>
          <p className="research">
            {lead.research ||
              "Vlastní kontakt. Poznámku si můžeš doplnit přes Upravit."}
          </p>
          {safeUrl(lead.source) && (
            <a
              className="source"
              href={safeUrl(lead.source)}
              target="_blank"
              rel="noreferrer"
            >
              Otevřít zdroj kontaktu <ExternalLink size={16} />
            </a>
          )}
          <h3>
            Historie hovorů <span className="muted">({lead.calls.length})</span>
          </h3>
          {lead.calls.length ? (
            [...lead.calls].reverse().map((c) => (
              <div className="mini-history" key={c.id}>
                <time>{dateLabel(c.at)}</time>
                <Status value={c.status} />
                <p className="prewrap">{c.note || "Bez poznámky"}</p>
                {c.nextAt && (
                  <small>Další kontakt: {dateLabel(c.nextAt)}</small>
                )}
              </div>
            ))
          ) : (
            <p className="muted">Zatím žádný zaznamenaný hovor.</p>
          )}
          <button
            className="button archive-button"
            onClick={async () => {
              const ok = await onUpdate((current) => ({
                ...current,
                archived: !current.archived,
                updatedAt: new Date().toISOString(),
              }));
              if (ok) onClose();
            }}
          >
            <Archive size={16} />
            {lead.archived ? "Obnovit z archivu" : "Přesunout do archivu"}
          </button>
        </div>
      )}
    </Modal>
  );
}
function CallFields({ lead }) {
  const [status, setStatus] = useState("");
  return (
    <>
      <label>
        Výsledek
        <select
          name="status"
          required
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="" disabled>
            Jak hovor dopadl?
          </option>
          {STATUSES.slice(1).map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      <label>
        Poznámka
        <textarea
          name="note"
          maxLength={20000}
          rows={4}
          placeholder="Co jste řešili? Co máš připravit?"
        />
      </label>
      <label>
        Další kontakt <span className="optional">nepovinné</span>
        <input
          name="nextAt"
          type="datetime-local"
          defaultValue={lead.nextAt ? localInput(new Date(lead.nextAt)) : ""}
          disabled={CLOSED.includes(status)}
        />
      </label>
      {CLOSED.includes(status) && (
        <p className="muted help">
          Tento výsledek zruší termín dalšího kontaktu.
        </p>
      )}
      {status === "Nekontaktovat" && (
        <p className="notice">
          Firma si nepřeje další oslovení. Nebude v seznamu k zavolání a
          tlačítko hovoru se vypne.
        </p>
      )}
    </>
  );
}
function ContactFields({ lead = {} }) {
  return (
    <>
      <label>
        Firma / jméno
        <input
          name="name"
          required
          maxLength={200}
          defaultValue={lead.name || ""}
        />
      </label>
      <label>
        Kontaktní osoba
        <input
          name="contact"
          maxLength={200}
          defaultValue={lead.contact || ""}
        />
      </label>
      <label>
        Telefon
        <input
          name="phone"
          type="tel"
          maxLength={80}
          defaultValue={lead.phone || ""}
        />
      </label>
      <label>
        E-mail
        <input
          name="email"
          type="email"
          maxLength={254}
          defaultValue={lead.email || ""}
        />
      </label>
      <div className="field-pair">
        <label>
          Příležitost
          <select name="category" defaultValue={lead.category || "Jiné"}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Priorita
          <select name="priority" defaultValue={lead.priority || "Střední"}>
            {PRIORITIES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Poznámka
        <textarea
          name="note"
          rows={3}
          maxLength={20000}
          defaultValue={lead.note || ""}
        />
      </label>
      <label>
        Zdroj / web
        <input
          name="source"
          type="url"
          pattern="https?://.*"
          maxLength={2000}
          placeholder="https://…"
          defaultValue={lead.source || ""}
        />
      </label>
    </>
  );
}
export function NewContact({ onClose, onAdd }) {
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const close = () => {
    if (!dirty || window.confirm("Zahodit rozepsaný kontakt?")) onClose();
  };
  return (
    <Modal className="drawer" label="Přidat kontakt" onClose={close}>
      <h2>Přidat kontakt</h2>
      <p className="muted">Nová firma. Nová příležitost.</p>
      <form
        onChange={() => setDirty(true)}
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          setBusy(true);
          const f = Object.fromEntries(new FormData(e.currentTarget));
          if (!f.name.trim()) {
            setError("Vyplň název firmy.");
            setBusy(false);
            return;
          }
          const ok = await onAdd({
            ...f,
            name: f.name.trim(),
            id: crypto.randomUUID(),
            research: "",
            calls: [],
            status: "Nevoláno",
            nextAt: "",
            archived: false,
            updatedAt: new Date().toISOString(),
          });
          setBusy(false);
          if (ok) onClose();
        }}
      >
        <ContactFields />
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button className="button primary full" disabled={busy}>
          <Plus size={18} />
          Přidat kontakt
        </button>
      </form>
    </Modal>
  );
}
export function BackupDialog({ data, onClose, onImport }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);
  const loadFile = async (e) => {
    setError("");
    setPending(null);
    const file = e.target.files[0];
    try {
      if (!file) return;
      if (file.size > 20 * 1024 * 1024)
        throw Error("Soubor je příliš velký (max. 20 MB).");
      setPending(validateBackup(JSON.parse(await file.text())));
    } catch (err) {
      setError(
        err instanceof SyntaxError ? "Soubor není platný JSON." : err.message,
      );
    }
    e.target.value = "";
  };
  return (
    <Modal className="backup-modal" label="Záloha dat" onClose={onClose}>
      <Database size={28} className="accent" />
      <h2>Záloha dat</h2>
      <p className="muted">
        Záznamy zůstávají v tomto prohlížeči. Smazáním dat prohlížeče o ně můžeš
        přijít. JSON záloha obsahuje i celou historii hovorů.
      </p>
      <div className="backup-actions">
        <button
          className="button primary"
          disabled={!data}
          onClick={() =>
            download(
              JSON.stringify(
                { ...data, exportedAt: new Date().toISOString() },
                null,
                2,
              ),
              `crm-${localInput().slice(0, 10)}.backup.json`,
            )
          }
        >
          <Download />
          Stáhnout zálohu JSON
        </button>
        <button
          className="button"
          disabled={!data}
          onClick={() =>
            download(
              csv(data),
              `crm-${localInput().slice(0, 10)}.csv`,
              "text/csv;charset=utf-8",
            )
          }
        >
          <Download />
          Export kontaktů pro Excel
        </button>
      </div>
      <hr />
      <h3>Obnovit nebo přenést data</h3>
      <p className="muted help">
        Import sloučí kontakty a historii. U stejných kontaktů zachová novější
        úpravu. Nic nemaže. Před importem si stáhni aktuální zálohu.
      </p>
      <label className="file-label">
        <Upload size={17} /> Vybrat zálohu JSON
        <input
          type="file"
          accept=".json,application/json"
          aria-label="Vybrat zálohu JSON"
          onChange={loadFile}
        />
      </label>
      {pending && (
        <div className="notice">
          <p>
            Platná záloha: {pending.leads.length} kontaktů,{" "}
            {pending.leads.reduce((n, l) => n + l.calls.length, 0)} hovorů.
          </p>
          <button
            className="button primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const ok = await onImport(pending);
              setBusy(false);
              if (ok) onClose();
            }}
          >
            Sloučit zálohu
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {!data && (
        <button
          className="button"
          onClick={() =>
            download(
              localStorage.getItem(KEY) || "",
              `crm-zachranna-kopie.txt`,
              "text/plain",
            )
          }
        >
          Stáhnout záchrannou kopii
        </button>
      )}
    </Modal>
  );
}
