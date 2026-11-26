"use client";
import { useState } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { Button, inputCls } from "./ui";
import type { Store } from "@/hooks/useStore";

function List({ store, type }: { store: Store; type: "income" | "expense" }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const cats = store.categoriesFor(type);

  async function rename(old: string) {
    const ok = await store.renameCategory(type, old, value);
    setMsg(ok ? "" : "Enter a different, unused name.");
    if (ok) setEditing(null);
  }

  return (
    <div>
      <h3 className="mb-2 font-semibold">{type === "income" ? "Income categories" : "Expense categories"}</h3>
      <ul className="space-y-1">
        {cats.map((c) => (
          <li key={c} className="flex items-center gap-2">
            {editing === c ? (
              <>
                <input aria-label="Category name" autoFocus className={inputCls} value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => e.key === "Enter" && rename(c)} />
                <button aria-label="Save" className="flex size-11 shrink-0 items-center justify-center" onClick={() => rename(c)}><Check size={18} /></button>
                <button aria-label="Cancel" className="flex size-11 shrink-0 items-center justify-center" onClick={() => setEditing(null)}><X size={18} /></button>
              </>
            ) : (
              <>
                <span className="flex-1 truncate">{c}</span>
                <button aria-label={`Rename ${c}`} className="flex size-11 items-center justify-center text-slate-500" onClick={() => { setEditing(c); setValue(c); setMsg(""); }}><Pencil size={16} /></button>
                <button
                  aria-label={`Delete ${c}`} className="flex size-11 items-center justify-center text-red-600"
                  onClick={() => confirm(`Delete category "${c}"? Existing transactions keep their category name.`) && store.removeCategory(type, c)}
                ><Trash2 size={16} /></button>
              </>
            )}
          </li>
        ))}
      </ul>
      {msg && <p role="alert" className="text-sm text-red-600">{msg}</p>}
      <form className="mt-2 flex gap-2" onSubmit={async (e) => { e.preventDefault(); if (await store.addCategory(type, name)) setName(""); }}>
        <input aria-label="New category" className={inputCls} placeholder="New category" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
        <Button type="submit" disabled={!name.trim()}>Add</Button>
      </form>
    </div>
  );
}

export function CategoryManager({ store }: { store: Store }) {
  return (
    <div className="space-y-6">
      <List store={store} type="expense" />
      <List store={store} type="income" />
    </div>
  );
}
