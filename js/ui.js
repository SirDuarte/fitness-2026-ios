export const UI = {
  qs(sel, root = document) { return root.querySelector(sel); },
  qsa(sel, root = document) { return [...root.querySelectorAll(sel)]; },

  fmtMonthTitle(date) {
    const f = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
    const s = f.format(date);
    return s.charAt(0).toUpperCase() + s.slice(1);
  },

  fmtDateLabel(iso) {
    // iso "YYYY-MM-DD"
    const [y,m,d] = iso.split("-").map(Number);
    const dt = new Date(y, m-1, d);
    const f = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });
    return f.format(dt);
  },

  isoToday() {
    const d = new Date();
    const tzOff = d.getTimezoneOffset() * 60000;
    return new Date(d - tzOff).toISOString().slice(0,10);
  },

  monthKeyFromDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth()+1).padStart(2,"0");
    return `${y}-${m}`;
  },

  addDownload(filename, text) {
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(url), 1500);
  },

  toast(el, msg) {
    el.textContent = msg;
    el.style.opacity = "1";
    setTimeout(()=>{ el.style.opacity = "0.9"; }, 1200);
  }
};
