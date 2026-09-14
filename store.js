import { KEY, validateBackup } from "./model";
import seed from "./seed.json";
export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return {
      data: raw ? validateBackup(JSON.parse(raw)) : { version: 1, leads: seed },
      error: null,
    };
  } catch {
    return {
      data: null,
      error:
        "Uložená data se nepodařilo načíst. Nic jsme nepřepsali. Stáhni záchrannou kopii a obnov platnou zálohu.",
    };
  }
}
export function save(data) {
  localStorage.setItem(KEY, JSON.stringify(validateBackup(data)));
}
export function download(text, name, type = "application/json") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
