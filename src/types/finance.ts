export type WalletType =
  | "credit_card"
  | "debit_card"
  | "pix"
  | "cash"
  | "bank_account"
  | "other";

export type InvoiceStatus = "open" | "closed" | "paid" | "cancelled";

export type TransactionType = "single" | "installment" | "recurring";

export type TransactionStatus =
  | "pending"
  | "confirmed"
  | "paid"
  | "cancelled"
  | "refunded";

export type TransactionSource = "web" | "whatsapp" | "system" | "import";

export type Wallet = {
  id: string;
  workspace_id: string;
  name: string;
  type: WalletType;
  owner_user_id: string | null;
  closing_day: number | null;
  due_day: number | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type Category = {
  id: string;
  workspace_id: string;
  name: string;
  color: string | null;
  icon: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type Invoice = {
  id: string;
  workspace_id: string;
  wallet_id: string;
  month: number;
  year: number;
  status: InvoiceStatus;
  closed_at: string | null;
  paid_at: string | null;
  paid_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Transaction = {
  id: string;
  workspace_id: string;
  wallet_id: string | null;
  invoice_id: string | null;
  category_id: string | null;
  created_by: string | null;
  responsible_user_id: string | null;
  amount: number;
  description: string;
  transaction_date: string;
  transaction_type: TransactionType;
  status: TransactionStatus;
  source: TransactionSource;
  installment_group_id: string | null;
  installment_number: number | null;
  installment_total: number | null;
  recurring_rule_id: string | null;
  created_at: string;
  updated_at: string;
};

export type TransactionEvent = {
  id: string;
  workspace_id: string;
  transaction_id: string | null;
  user_id: string | null;
  event_type: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  description: string | null;
  created_at: string;
};

export type CreateWalletInput = {
  workspace_id: string;
  name: string;
  type: WalletType;
  owner_user_id?: string | null;
  closing_day?: number | null;
  due_day?: number | null;
};

export type CreateCategoryInput = {
  workspace_id: string;
  name: string;
  color?: string | null;
  icon?: string | null;
};

export type CreateInvoiceInput = {
  workspace_id: string;
  wallet_id: string;
  month: number;
  year: number;
};

export type CreateTransactionInput = {
  workspace_id: string;
  wallet_id?: string | null;
  invoice_id?: string | null;
  category_id?: string | null;
  responsible_user_id?: string | null;
  amount: number;
  description: string;
  transaction_date: string;
  transaction_type?: TransactionType;
  status?: TransactionStatus;
};
export type UpdateWalletInput = {
  name: string;
  type: WalletType;
  owner_user_id?: string | null;
  closing_day?: number | null;
  due_day?: number | null;
};

export type UpdateCategoryInput = {
  name: string;
  color?: string | null;
  icon?: string | null;
};