"use client";

import { Field } from "@/components/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { FormFieldDef } from "@/lib/doc-forms";

/** 文書タイプ別スキーマ駆動のガイド入力フォーム */
export function GuidedFields({
  defs,
  values,
  onChange,
}: {
  defs: FormFieldDef[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {defs.map((def) => (
        <Field
          key={def.key}
          label={def.label}
          htmlFor={`f-${def.key}`}
          hint={def.hint}
          className={def.multiline ? "sm:col-span-2" : undefined}
        >
          {def.multiline ? (
            <Textarea
              id={`f-${def.key}`}
              value={values[def.key] ?? ""}
              placeholder={def.placeholder}
              onChange={(e) => onChange(def.key, e.target.value)}
            />
          ) : (
            <Input
              id={`f-${def.key}`}
              value={values[def.key] ?? ""}
              placeholder={def.placeholder}
              onChange={(e) => onChange(def.key, e.target.value)}
            />
          )}
        </Field>
      ))}
    </div>
  );
}
