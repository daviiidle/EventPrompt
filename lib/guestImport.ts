export type GuestImportRow = {
  name: string;
  email?: string | null;
  phone?: string | null;
};

export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/[^\d]/g, "");
  if (!digits) return null;
  if (hasPlus) {
    return `+${digits}`;
  }
  if (digits.startsWith("04") && digits.length === 10) {
    return `+614${digits.slice(2)}`;
  }
  if (digits.startsWith("61") && digits.length >= 9 && digits.length <= 15) {
    return `+${digits}`;
  }
  if (digits.length >= 8 && digits.length <= 15) {
    return `+${digits}`;
  }
  return null;
}

export function normalizeEmail(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().toLowerCase();
  return trimmed ? trimmed : null;
}

export function validateImportRows(rows: GuestImportRow[]) {
  const errors: Array<{ index: number; message: string }> = [];
  const normalized = rows.map((row, index) => {
    const name = row.name?.trim() ?? "";
    const email = normalizeEmail(row.email ?? null);
    const phone = normalizePhone(row.phone ?? null);

    if (!name) {
      errors.push({ index, message: "Missing name." });
    }
    if (!email && !phone) {
      errors.push({ index, message: "Missing email or phone." });
    }

    return {
      name,
      email,
      phone,
    };
  });

  return { normalized, errors };
}
