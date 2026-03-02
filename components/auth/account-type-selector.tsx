"use client";

import { cn } from "@/lib/utils";

export type AccountType = "LEARNER" | "ADMIN";

type Props = {
  value: AccountType;
  onChange: (value: AccountType) => void;
};

export function AccountTypeSelector({ value, onChange }: Props) {
  const options: { id: AccountType; title: string; subtitle: string }[] = [
    { id: "LEARNER", title: "Learner", subtitle: "Student / Trainee" },
    { id: "ADMIN", title: "Admin", subtitle: "Super / Programme Admin" },
  ];

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-800">Choose account type</p>
      <div className="flex gap-3">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={cn(
              "flex-1 rounded-lg border px-4 py-3 text-left shadow-sm transition-all",
              value === opt.id
                ? "border-blue-600 bg-blue-50"
                : "border-gray-200 bg-white hover:border-blue-300"
            )}
          >
            <div className="text-sm font-semibold text-gray-900">
              {opt.title}
            </div>
            <div className="text-xs text-gray-500">{opt.subtitle}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

