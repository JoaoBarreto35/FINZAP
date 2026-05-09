import type { Category, TransactionType, Wallet } from "../../types/finance";
import { parseCurrencyToNumber } from "../parseCurrency";

export type ParsedWhatsappMessage = {
  description: string;
  amount: number;
  wallet_id: string | null;
  category_id: string | null;
  transaction_date: string;
  transaction_type: TransactionType;
  installments_count: number | null;
  charge_day: number | null;
  confidence: "low" | "medium" | "high";
  warnings: string[];
};

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getYesterdayDate() {
  const date = new Date();
  date.setDate(date.getDate() - 1);

  return date.toISOString().slice(0, 10);
}

function extractAmount(message: string) {
  const amountRegex = /(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)/i;
  const match = message.match(amountRegex);

  if (!match) {
    return {
      amount: 0,
      rawAmount: "",
    };
  }

  return {
    amount: parseCurrencyToNumber(match[1]),
    rawAmount: match[1],
  };
}

function extractDate(message: string) {
  const normalizedMessage = normalizeText(message);

  if (normalizedMessage.includes("ontem")) {
    return {
      transactionDate: getYesterdayDate(),
      rawDate: "ontem",
    };
  }

  if (normalizedMessage.includes("hoje")) {
    return {
      transactionDate: getTodayDate(),
      rawDate: "hoje",
    };
  }

  const dateRegex = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/;
  const match = message.match(dateRegex);

  if (!match) {
    return {
      transactionDate: getTodayDate(),
      rawDate: "",
    };
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const currentYear = new Date().getFullYear();
  const year = match[3]
    ? Number(match[3].length === 2 ? `20${match[3]}` : match[3])
    : currentYear;

  const date = new Date(year, month - 1, day);

  if (
    Number.isNaN(date.getTime()) ||
    date.getDate() !== day ||
    date.getMonth() + 1 !== month ||
    date.getFullYear() !== year
  ) {
    return {
      transactionDate: getTodayDate(),
      rawDate: match[0],
    };
  }

  return {
    transactionDate: date.toISOString().slice(0, 10),
    rawDate: match[0],
  };
}

function extractInstallments(message: string) {
  const normalizedMessage = normalizeText(message);

  const patterns = [
    /\b(\d{1,3})\s*x\b/i,
    /\bem\s+(\d{1,3})\s*x\b/i,
    /\bparcelado\s+em\s+(\d{1,3})\b/i,
    /\b(\d{1,3})\s+parcelas\b/i,
  ];

  for (const pattern of patterns) {
    const match = normalizedMessage.match(pattern);

    if (match) {
      const count = Number(match[1]);

      if (count > 1) {
        return {
          installmentsCount: count,
          rawInstallments: match[0],
        };
      }
    }
  }

  return {
    installmentsCount: null,
    rawInstallments: "",
  };
}

function extractRecurring(message: string) {
  const normalizedMessage = normalizeText(message);

  const recurringTerms = [
    "todo mes",
    "mensal",
    "fixo",
    "recorrente",
    "assinatura",
  ];

  const isRecurring = recurringTerms.some((term) =>
    normalizedMessage.includes(term),
  );

  const chargeDayRegex = /\bdia\s+(\d{1,2})\b/i;
  const chargeDayMatch = normalizedMessage.match(chargeDayRegex);

  const chargeDay = chargeDayMatch ? Number(chargeDayMatch[1]) : null;

  return {
    isRecurring,
    chargeDay:
      chargeDay && chargeDay >= 1 && chargeDay <= 31 ? chargeDay : null,
    rawRecurring: isRecurring ? "recorrente" : "",
    rawChargeDay: chargeDayMatch?.[0] ?? "",
  };
}

function detectTransactionType(
  installmentsCount: number | null,
  isRecurring: boolean,
): TransactionType {
  if (installmentsCount && installmentsCount > 1) {
    return "installment";
  }

  if (isRecurring) {
    return "recurring";
  }

  return "single";
}

function findWallet(message: string, wallets: Wallet[]) {
  const normalizedMessage = normalizeText(message);

  return (
    wallets.find((wallet) => {
      const walletName = normalizeText(wallet.name);
      const walletType = normalizeText(wallet.type);

      const walletAliases: Record<string, string[]> = {
        credit_card: ["cartao", "credito", "cartao de credito"],
        debit_card: ["debito", "cartao de debito"],
        pix: ["pix"],
        cash: ["dinheiro", "cash"],
        bank_account: ["conta", "banco", "conta bancaria"],
        other: ["outro"],
      };

      const aliases = walletAliases[wallet.type] ?? [];

      return (
        normalizedMessage.includes(walletName) ||
        normalizedMessage.includes(walletType) ||
        aliases.some((alias) => normalizedMessage.includes(alias))
      );
    }) ?? null
  );
}

function findCategory(message: string, categories: Category[]) {
  const normalizedMessage = normalizeText(message);

  return (
    categories.find((category) => {
      const categoryName = normalizeText(category.name);
      return normalizedMessage.includes(categoryName);
    }) ?? null
  );
}

function buildDescription(
  message: string,
  rawAmount: string,
  rawDate: string,
  rawInstallments: string,
  rawChargeDay: string,
) {
  let description = message;

  if (rawAmount) {
    description = description.replace(rawAmount, "");
    description = description.replace("R$", "");
    description = description.replace("r$", "");
  }

  if (rawDate) {
    description = description.replace(rawDate, "");
  }

  if (rawInstallments) {
    description = description.replace(rawInstallments, "");
  }

  if (rawChargeDay) {
    description = description.replace(rawChargeDay, "");
  }

  description = description
    .replace(/\s+/g, " ")
    .replace(/\bno\b/gi, "")
    .replace(/\bna\b/gi, "")
    .replace(/\bem\b/gi, "")
    .replace(/\bhoje\b/gi, "")
    .replace(/\bontem\b/gi, "")
    .replace(/\btodo mês\b/gi, "")
    .replace(/\btodo mes\b/gi, "")
    .replace(/\bmensal\b/gi, "")
    .replace(/\bfixo\b/gi, "")
    .replace(/\brecorrente\b/gi, "")
    .replace(/\bparcelado\b/gi, "")
    .replace(/\bparcelas\b/gi, "")
    .trim();

  return description || "Lançamento via WhatsApp";
}

export function parseWhatsappMessage(
  message: string,
  wallets: Wallet[],
  categories: Category[],
): ParsedWhatsappMessage {
  const warnings: string[] = [];

  const { amount, rawAmount } = extractAmount(message);
  const { transactionDate, rawDate } = extractDate(message);
  const { installmentsCount, rawInstallments } = extractInstallments(message);
  const { isRecurring, chargeDay, rawChargeDay } = extractRecurring(message);

  const wallet = findWallet(message, wallets);
  const category = findCategory(message, categories);

  const transactionType = detectTransactionType(installmentsCount, isRecurring);

  const description = buildDescription(
    message,
    rawAmount,
    rawDate,
    rawInstallments,
    rawChargeDay,
  );

  if (amount <= 0) {
    warnings.push("Não consegui identificar um valor válido.");
  }

  if (!wallet) {
    warnings.push("Não consegui identificar a carteira.");
  }

  if (!category) {
    warnings.push("Não consegui identificar a categoria.");
  }

  if (transactionType === "installment" && !installmentsCount) {
    warnings.push("Não consegui identificar a quantidade de parcelas.");
  }

  let confidence: ParsedWhatsappMessage["confidence"] = "high";

  if (warnings.length === 1) {
    confidence = "medium";
  }

  if (warnings.length >= 2) {
    confidence = "low";
  }

  return {
    description,
    amount,
    wallet_id: wallet?.id ?? null,
    category_id: category?.id ?? null,
    transaction_date: transactionDate,
    transaction_type: transactionType,
    installments_count: installmentsCount,
    charge_day: chargeDay,
    confidence,
    warnings,
  };
}