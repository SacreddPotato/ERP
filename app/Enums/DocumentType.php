<?php

namespace App\Enums;

enum DocumentType: string
{
    case PurchaseInvoice = 'purchase_invoice';
    case SalesInvoice = 'sales_invoice';
    case RawMaterialsOrder = 'raw_materials_order';
    case FinishedProductReceipt = 'finished_product_receipt';
    case InternalTransfer = 'internal_transfer';

    public function label(): string
    {
        return match ($this) {
            self::PurchaseInvoice => __('doc_purchase_invoice'),
            self::SalesInvoice => __('doc_sales_invoice'),
            self::RawMaterialsOrder => __('doc_raw_materials_order'),
            self::FinishedProductReceipt => __('doc_finished_product_receipt'),
            self::InternalTransfer => __('doc_internal_transfer'),
        };
    }
}
