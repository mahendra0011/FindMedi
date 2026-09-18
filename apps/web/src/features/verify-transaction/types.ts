/** Verify-transaction feature — types. */
export interface TransactionResult { payment?: { transaction_id?: string; invoice_id?: string; amount?: number; method?: string; status?: string }; reference?: unknown; patient?: unknown; hospital?: unknown }
