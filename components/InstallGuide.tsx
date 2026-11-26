export function InstallGuide() {
  return (
    <div className="rounded-xl bg-slate-100 p-3 text-sm dark:bg-slate-800">
      <h3 className="mb-1 font-semibold">Install as an app</h3>
      <p><b>iPhone (Safari):</b> tap the Share button, choose <i>Add to Home Screen</i>, then <i>Add</i>.</p>
      <p className="mt-1"><b>Android (Chrome):</b> open the ⋮ menu and choose <i>Install app</i> / <i>Add to Home screen</i>.</p>
      <p className="mt-1"><b>Desktop (Chrome/Edge):</b> click the install icon in the address bar.</p>
    </div>
  );
}
