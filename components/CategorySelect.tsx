"use client";
import { useState } from "react";
import { Button, cx, inputCls } from "./ui";

const NEW = "__new__";

export function CategorySelect({
  value, categories, onChange, onAdd, className, label = "Category",
}: {
  value: string;
  categories: string[];
  onChange: (v: string) => void;
  onAdd: (name: string) => Promise<string | null>;
  className?: string;
  label?: string;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  async function add() {
    const added = await onAdd(name);
    if (added) {
      onChange(added);
      setAdding(false);
      setName("");
    }
  }

  if (adding) {
    return (
      <div className={cx("flex gap-2", className)}>
        <input
          aria-label="New category name" autoFocus maxLength={40} className={inputCls} placeholder="New category"
          value={name} onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
        />
        <Button type="button" onClick={add} disabled={!name.trim()}>Add</Button>
        <Button type="button" variant="ghost" onClick={() => setAdding(false)}>✕</Button>
      </div>
    );
  }
  return (
    <select aria-label={label} className={cx(inputCls, className)} value={value} onChange={(e) => (e.target.value === NEW ? setAdding(true) : onChange(e.target.value))}>
      {[...new Set([...categories, value])].filter(Boolean).map((c) => <option key={c}>{c}</option>)}
      <option value={NEW}>+ Add new category…</option>
    </select>
  );
}
