"use client";

import { Field } from "@/components/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { FormFieldDef } from "@/lib/doc-forms";

/** 文書タイプ別スキーマ駆動のガイド入力フォーム */
export function GuidedFields({
  defs,
  values,
  errors,
  onChange,
}: {
  defs: FormFieldDef[];
  values: Record<string, string>;
  errors?: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {defs.map((def) => {
        const id = `f-${def.key}`;
        const error = errors?.[def.key];
        const shared = {
          id,
          value: values[def.key] ?? "",
          placeholder: def.placeholder,
          "aria-required": def.required,
          "aria-invalid": !!error,
          "aria-describedby": error ? `${id}-err` : undefined,
          onChange: (
            e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
          ) => onChange(def.key, e.target.value),
        };
        return (
          <Field
            key={def.key}
            label={def.label}
            htmlFor={id}
            required={def.required}
            hint={def.hint}
            error={error}
            className={def.multiline ? "sm:col-span-2" : undefined}
          >
            {def.multiline ? <Textarea {...shared} /> : <Input {...shared} />}
          </Field>
        );
      })}
    </div>
  );
}
