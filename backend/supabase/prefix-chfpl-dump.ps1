param(
  [Parameter(Mandatory=$true)][string]$InputFile,
  [Parameter(Mandatory=$true)][string]$OutputFile
)

# Converts a CHFPL pg_dump data-only SQL file so it targets the shared GRD
# database tables with the chfpl_ prefix.
$tables = @(
  "users","dealer_master","dealer_users","vehicle_oem_master","vehicle_model_master",
  "dealer_vehicle_mapping","customer_profiles","loan_applications","guarantor_details",
  "kyc_documents","application_status_history","fi_reports","sanction_records",
  "dealer_incentives","otp_codes","hypothecation_master","loan_type_master",
  "staff_accounts","telecaller_registers","telecaller_call_logs","loan_receipts",
  "loan_payment_vouchers","delivery_details","sales","co_borrower_details",
  "expense_master","loan_expenses","loan_charges","audit_logs","loan_status_history",
  "emi_schedule","collection_entries","payment_transactions","emandate_records",
  "loan_ledger","payment_webhook_events","loan_disbursement_events","risk_config",
  "loan_restructure_requests","telecaller_ptp","loan_tvrs","chf_application_counters"
)

$text = Get-Content -Raw -LiteralPath $InputFile

foreach ($table in $tables) {
  $text = [regex]::Replace(
    $text,
    "(?<!chfpl_)\bpublic\.$table\b",
    "public.chfpl_$table"
  )

  $text = [regex]::Replace(
    $text,
    "(?<!chfpl_)public\.$table_([A-Za-z0-9_]+_seq)\b",
    ("public.chfpl_" + $table + "_$1")
  )
}

Set-Content -LiteralPath $OutputFile -Value $text -Encoding UTF8
Write-Host "Created: $OutputFile"
