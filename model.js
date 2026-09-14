export const STATUSES = [
  "Nevoláno",
  "Nedovolal jsem se",
  "Má zájem",
  "Zavolat později",
  "Nabídka odeslána",
  "Domluvená spolupráce",
  "Nemá zájem",
  "Nekontaktovat",
];
export const CATEGORIES = [
  "Web nenalezen",
  "Modernizace",
  "Správa webu",
  "Externí spolupráce",
  "Jiné",
];
export const PRIORITIES = ["Vysoká", "Střední", "Nízká"];
export const CLOSED = ["Nemá zájem", "Nekontaktovat", "Domluvená spolupráce"];
export const KEY = "mojewebovna-crm-v1";
export function localInput(date = new Date()) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
export function dateLabel(value) {
  return value
    ? new Date(value).toLocaleString("cs-CZ", {
        day: "numeric",
        month: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
}
export const due = (lead, now = new Date()) =>
  !lead.archived &&
  !CLOSED.includes(lead.status) &&
  !!lead.nextAt &&
  new Date(lead.nextAt) <= now;
export const normalize = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export function filterLeads(
  leads,
  {
    query = "",
    status = "",
    category = "",
    view = "contacts",
    sort = "default",
  },
  now = new Date(),
) {
  const found = leads.filter(
    (l) =>
      (view === "archive" ? l.archived : !l.archived) &&
      (view !== "due" || due(l, now)) &&
      (!status || l.status === status) &&
      (!category || l.category === category) &&
      normalize(
        [
          l.name,
          l.phone,
          l.email,
          l.research,
          l.note,
          ...l.calls.map((c) => c.note),
        ].join(" "),
      ).includes(normalize(query)),
  );
  return found.sort((a, b) =>
    sort === "name"
      ? a.name.localeCompare(b.name, "cs")
      : sort === "priority"
        ? PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority)
        : sort === "next" || view === "due"
          ? (a.nextAt || "9999").localeCompare(b.nextAt || "9999")
          : 0,
  );
}
export function recordCall(lead, { at, status, note, nextAt, id }) {
  if (id && lead.calls.some(c => c.id === id)) return lead;
  if (lead.archived || lead.status === 'Nekontaktovat')
    throw Error('Kontakt je archivovaný nebo označený Nekontaktovat. Hovor nebyl přidán.');
  if (
    !at ||
    !Number.isFinite(Date.parse(at)) ||
    Date.parse(at) > Date.now() + 60000
  )
    throw Error("Zadej platné datum proběhlého hovoru.");
  if (!STATUSES.slice(1).includes(status))
    throw Error("Vyber výsledek hovoru.");
  if (
    nextAt &&
    (!Number.isFinite(Date.parse(nextAt)) ||
      Date.parse(nextAt) <= Date.parse(at))
  )
    throw Error("Další kontakt musí být později než tento hovor.");
  const call = {
    id: id || crypto.randomUUID(),
    at: new Date(at).toISOString(),
    status,
    note: note.trim(),
    nextAt: CLOSED.includes(status)
      ? ""
      : nextAt
        ? new Date(nextAt).toISOString()
        : "",
  };
  const calls = [...lead.calls, call].sort((a, b) => a.at.localeCompare(b.at));
  const latest = calls.at(-1);
  return {
    ...lead,
    calls,
    status: latest.status,
    nextAt: latest.nextAt,
    updatedAt: new Date().toISOString(),
  };
}
const isText = (v, max = 20000) => typeof v === "string" && v.length <= max;
const validDate = (v) => isText(v, 40) && Number.isFinite(Date.parse(v));
export function validateBackup(data) {
  if (
    !data ||
    data.version !== 1 ||
    !Array.isArray(data.leads) ||
    data.leads.length > 10000
  )
    throw Error("Soubor není platná záloha CRM verze 1.");
  const ids = new Set();
  const callIds = new Set();
  for (const l of data.leads) {
    if (
      !l ||
      !isText(l.id, 100) ||
      !l.id ||
      ids.has(l.id) ||
      !isText(l.name, 200) ||
      !l.name.trim() ||
      !STATUSES.includes(l.status) ||
      !CATEGORIES.includes(l.category) ||
      !PRIORITIES.includes(l.priority) ||
      typeof l.archived !== "boolean" ||
      !validDate(l.updatedAt) ||
      !Array.isArray(l.calls) ||
      l.calls.length > 10000
    )
      throw Error("Záloha obsahuje neplatný nebo duplicitní kontakt.");
    ids.add(l.id);
    for (const key of [
      "phone",
      "email",
      "contact",
      "research",
      "source",
      "note",
    ])
      if (!isText(l[key])) throw Error("V záloze chybí povinná textová pole.");
    if (l.nextAt !== "" && !validDate(l.nextAt))
      throw Error("Neplatný termín v záloze.");
    for (const c of l.calls) {
      if (
        !c ||
        !isText(c.id, 100) ||
        !c.id ||
        callIds.has(c.id) ||
        !validDate(c.at) ||
        !STATUSES.slice(1).includes(c.status) ||
        !isText(c.note) ||
        (c.nextAt !== "" && !validDate(c.nextAt))
      )
        throw Error("Neplatný nebo duplicitní hovor v záloze.");
      callIds.add(c.id);
    }
  }
  return data;
}
export function mergeBackup(current, incoming) {
  validateBackup(current);
  validateBackup(incoming);
  const leads = new Map(current.leads.map((l) => [l.id, l]));
  for (const l of incoming.leads) {
    const old = leads.get(l.id);
    if (!old) {
      leads.set(l.id, l);
      continue;
    }
    const newest =
      Date.parse(l.updatedAt) > Date.parse(old.updatedAt) ? l : old;
    const calls = new Map(old.calls.map((c) => [c.id, c]));
    for (const c of l.calls) if (!calls.has(c.id)) calls.set(c.id, c);
    leads.set(l.id, {
      ...newest,
      calls: [...calls.values()].sort((a, b) => a.at.localeCompare(b.at)),
    });
  }
  return validateBackup({ version: 1, leads: [...leads.values()] });
}
export function safeUrl(value) {
  try {
    const u = new URL(value);
    return ["http:", "https:"].includes(u.protocol) ? u.href : null;
  } catch {
    return null;
  }
}
export function csv(data) {
  const quote = (value) =>
    '"' +
    String(value ?? "")
      .replace(/^[=+@\-\t\r]/, "'$&")
      .replaceAll('"', '""') +
    '"';
  const rows = [
    [
      "Firma",
      "Telefon",
      "E-mail",
      "Stav",
      "Priorita",
      "Příležitost",
      "Poslední hovor",
      "Další kontakt",
      "Poznámka",
      "Rešerše",
      "Zdroj",
      "Archivováno",
    ],
    ...data.leads.map((l) => [
      l.name,
      l.phone,
      l.email,
      l.status,
      l.priority,
      l.category,
      l.calls.at(-1)?.at,
      l.nextAt,
      l.note,
      l.research,
      l.source,
      l.archived ? "Ano" : "Ne",
    ]),
  ];
  return "\uFEFF" + rows.map((row) => row.map(quote).join(";")).join("\r\n");
}
