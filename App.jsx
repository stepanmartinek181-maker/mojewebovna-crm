import React, { useEffect, useMemo, useState } from "react";
import { Plus, CheckCircle, AlertCircle, X } from "lucide-react";
import {
  Sidebar,
  Stats,
  Filters,
  ContactsTable,
  History,
  ContactDrawer,
  NewContact,
  BackupDialog,
} from "./components";
import { filterLeads, due, mergeBackup, KEY } from "./model";
import { load, save } from "./store";
export default function App() {
  const [initial] = useState(load);
  const [data, setData] = useState(initial.data);
  const [error, setError] = useState(initial.error);
  const [notice, setNotice] = useState("");
  const [view, setView] = useState("contacts");
  const [selected, setSelected] = useState(null);
  const [newOpen, setNewOpen] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const [filters, setFilters] = useState({
    query: "",
    status: "",
    category: "",
    sort: "default",
  });
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 30000);
    const sync = (e) => {
      if (e.key === KEY) {
        const current = load();
        setData(current.data);
        setError(current.error);
      }
    };
    window.addEventListener("storage", sync);
    return () => {
      clearInterval(tick);
      window.removeEventListener("storage", sync);
    };
  }, []);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(t);
  }, [notice]);
  async function commit(transform, message = "Uloženo v tomto prohlížeči") {
    const write = async () => {
      try {
        const current = load();
        if (current.error) throw Error(current.error);
        const next = transform(current.data);
        save(next);
        setData(next);
        setError("");
        setNotice(message);
        return true;
      } catch (err) {
        setError(
          `Nepodařilo se uložit: ${err.message} Změny nejsou potvrzené. Stáhni zálohu a zkus to znovu.`,
        );
        return false;
      }
    };
    return navigator.locks ? navigator.locks.request(KEY, write) : write();
  }
  const leads = data?.leads || [];
  const visible = useMemo(
    () => filterLeads(leads, { ...filters, view }, now),
    [data, filters, view, now],
  );
  const current = leads.find((l) => l.id === selected?.id);
  const changeView = (v) => {
    setView(v);
    setFilters({ query: "", status: "", category: "", sort: "default" });
  };
  return (
    <div className={`app ${current || newOpen ? "has-drawer" : ""}`}>
      <Sidebar
        view={view}
        setView={changeView}
        onBackup={() => setBackupOpen(true)}
        dueCount={leads.filter((l) => due(l, now)).length}
      />
      <main>
        <header className="page-header">
          <div>
            <h1>
              {
                {
                  contacts: "Kontakty",
                  due: "K zavolání",
                  history: "Historie",
                  archive: "Archiv",
                }[view]
              }
            </h1>
            <p>
              {
                {
                  contacts: "Každý dobrý projekt začíná rozhovorem.",
                  due: "Domluvené termíny, které už nastaly.",
                  history: "Všechno, co jste spolu probrali.",
                  archive: "Odložené kontakty. Historie zůstává.",
                }[view]
              }
            </p>
          </div>
          <button
            className="button primary"
            disabled={!data}
            onClick={() => setNewOpen(true)}
          >
            <Plus size={20} />
            Přidat kontakt
          </button>
        </header>
        {error && (
          <div role="alert" className="error-banner">
            <AlertCircle />
            <span>{error}</span>
            <button className="button" onClick={() => setBackupOpen(true)}>
              Záloha a obnova
            </button>
          </div>
        )}
        {data && (
          <>
            <Stats leads={leads} />
            {view === "history" ? (
              <History
                leads={leads}
                onOpen={(id, tab) => setSelected({ id, tab })}
              />
            ) : (
              <>
                <Filters filters={filters} setFilters={setFilters} />
                <ContactsTable
                  leads={visible}
                  view={view}
                  selected={selected?.id}
                  onOpen={(id, tab) => setSelected({ id, tab })}
                />
                <footer className="table-footer">
                  <span>
                    {visible.length} z{" "}
                    {
                      leads.filter((l) =>
                        view === "archive" ? l.archived : !l.archived,
                      ).length
                    }{" "}
                    kontaktů
                  </span>
                  <span>
                    Rešerše ≠ potvrzený zájem. Podrobnosti a zdroje otevřeš
                    kliknutím na firmu.
                  </span>
                </footer>
              </>
            )}
          </>
        )}
      </main>
      {current && (
        <ContactDrawer
          key={current.id}
          lead={current}
          initialTab={selected.tab}
          onClose={() => setSelected(null)}
          onUpdate={(transform) =>
            commit((state) => ({
              ...state,
              leads: state.leads.map((l) =>
                l.id === current.id ? transform(l) : l,
              ),
            }))
          }
        />
      )}
      {newOpen && (
        <NewContact
          onClose={() => setNewOpen(false)}
          onAdd={(lead) =>
            commit(
              (state) => ({ ...state, leads: [lead, ...state.leads] }),
              "Kontakt přidán",
            )
          }
        />
      )}
      {backupOpen && (
        <BackupDialog
          data={data}
          onClose={() => setBackupOpen(false)}
          onImport={async (incoming) => {
            if (data)
              return commit(
                (current) => mergeBackup(current, incoming),
                "Záloha sloučena",
              );
            try {
              save(incoming);
              setData(incoming);
              setError("");
              setNotice("Záloha obnovena");
              return true;
            } catch (e) {
              setError(e.message);
              return false;
            }
          }}
        />
      )}
      <div className="toast-region" aria-live="polite">
        {notice && (
          <div className="toast">
            <CheckCircle size={18} />
            {notice}
            <button aria-label="Skrýt oznámení" onClick={() => setNotice("")}>
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
