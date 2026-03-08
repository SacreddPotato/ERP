import React, { useState, useCallback } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Card, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input, Select, Textarea } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { toast } from '../ui/Toast';
import api from '../../lib/api';
import { CATEGORIES, UNITS, FACTORIES, DOCUMENT_TYPES, StockItem } from '../../types';

export default function StockManager() {
    const { t, factory } = useApp();
    const [itemId, setItemId] = useState('');
    const [existingItem, setExistingItem] = useState<StockItem | null>(null);
    const [isNewItem, setIsNewItem] = useState(false);
    const [loading, setLoading] = useState(false);

    // New item fields
    const [name, setName] = useState('');
    const [category, setCategory] = useState('');
    const [unit, setUnit] = useState('');
    const [supplier, setSupplier] = useState('');
    const [startingBalance, setStartingBalance] = useState('');
    const [unitPrice, setUnitPrice] = useState('');
    const [minStock, setMinStock] = useState('');
    const [balanceDate, setBalanceDate] = useState('');

    // Update stock fields
    const [transactionType, setTransactionType] = useState('');
    const [quantity, setQuantity] = useState('');
    const [incomingSupplier, setIncomingSupplier] = useState('');
    const [shipmentPrice, setShipmentPrice] = useState('');
    const [transactionDate, setTransactionDate] = useState('');
    const [documentType, setDocumentType] = useState('');
    const [documentNumber, setDocumentNumber] = useState('');
    const [notes, setNotes] = useState('');
    const [transferFrom, setTransferFrom] = useState(factory);
    const [transferTo, setTransferTo] = useState('');

    const generateId = useCallback(async () => {
        try {
            const res = await api.get('/api/stock/generate-id');
            setItemId(res.data.id);
        } catch { toast(t('sync_failed'), 'error'); }
    }, [t]);

    const checkId = useCallback(async () => {
        if (!itemId.trim()) return;
        setLoading(true);
        try {
            const res = await api.post('/api/stock/check-id', { item_code: itemId });
            if (res.data.exists) {
                setExistingItem(res.data.item);
                setIsNewItem(false);
                toast(`${itemId} ${t('msg_item_found')}`, 'info');
            } else {
                setExistingItem(null);
                setIsNewItem(true);
                toast(t('msg_new_item'), 'info');
            }
        } catch { toast(t('sync_failed'), 'error'); }
        setLoading(false);
    }, [itemId, t]);

    const resetForm = () => {
        setItemId(''); setExistingItem(null); setIsNewItem(false);
        setName(''); setCategory(''); setUnit(''); setSupplier('');
        setStartingBalance(''); setUnitPrice(''); setMinStock(''); setBalanceDate('');
        setTransactionType(''); setQuantity(''); setIncomingSupplier('');
        setShipmentPrice(''); setTransactionDate(''); setDocumentType('');
        setDocumentNumber(''); setNotes(''); setTransferTo('');
    };

    const addItem = useCallback(async () => {
        if (!name || !category || !unit) { toast(t('msg_fill_all'), 'warning'); return; }
        setLoading(true);
        try {
            await api.post('/api/stock/store', {
                item_code: itemId, name, category, unit, supplier,
                starting_balance: startingBalance || 0,
                unit_price: unitPrice || 0,
                min_stock: minStock || 0,
                balance_date: balanceDate || null,
            });
            toast(t('msg_item_added'), 'success');
            resetForm();
            window.dispatchEvent(new CustomEvent('stock-updated'));
        } catch (e: any) {
            toast(e.response?.data?.message || t('sync_failed'), 'error');
        }
        setLoading(false);
    }, [itemId, name, category, unit, supplier, startingBalance, unitPrice, minStock, balanceDate, t]);

    const updateStock = useCallback(async () => {
        if (!transactionType) { toast(t('msg_select_transaction'), 'warning'); return; }
        if (!quantity || parseFloat(quantity) <= 0) { toast(t('msg_valid_quantity'), 'warning'); return; }
        setLoading(true);
        try {
            await api.post('/api/stock/update-stock', {
                item_code: itemId,
                transaction_type: transactionType,
                quantity: parseFloat(quantity),
                supplier: incomingSupplier || undefined,
                price: shipmentPrice ? parseFloat(shipmentPrice) : undefined,
                transaction_date: transactionDate || undefined,
                document_type: documentType || undefined,
                document_number: documentNumber || undefined,
                notes: notes || undefined,
                transfer_from: transferFrom,
                transfer_to: transferTo || undefined,
            });
            toast(t('msg_stock_updated'), 'success');
            resetForm();
            window.dispatchEvent(new CustomEvent('stock-updated'));
        } catch (e: any) {
            toast(e.response?.data?.message || t('sync_failed'), 'error');
        }
        setLoading(false);
    }, [itemId, transactionType, quantity, incomingSupplier, shipmentPrice, transactionDate, documentType, documentNumber, notes, transferFrom, transferTo, t]);

    const catOptions = CATEGORIES.map(c => ({ value: c.value, label: t(c.labelKey) }));
    const unitOptions = UNITS.map(u => ({ value: u.value, label: t(u.labelKey) }));
    const factoryOptions = FACTORIES.map(f => ({ value: f.value, label: t(f.labelKey) }));
    const docTypeOptions = DOCUMENT_TYPES.map(d => ({ value: d.value, label: t(d.labelKey) }));

    return (
        <div className="space-y-6">
            {/* Item Entry */}
            <Card>
                <CardHeader title={t('item_entry')} subtitle={t('hint_id_auto')} />

                <div className="flex items-end gap-3 mb-6">
                    <div className="flex-1">
                        <Input
                            label={t('item_id')}
                            value={itemId}
                            onChange={(e) => setItemId(e.target.value)}
                            placeholder={t('placeholder_item_id')}
                            onKeyDown={(e) => e.key === 'Enter' && checkId()}
                        />
                    </div>
                    <Button variant="secondary" onClick={generateId} size="md">{t('btn_generate_id')}</Button>
                    <Button onClick={checkId} loading={loading} size="md">{t('btn_check_id')}</Button>
                </div>

                {/* Existing Item Info */}
                {existingItem && (
                    <div className="bg-indigo-50 rounded-xl p-5 mb-6 border border-indigo-100">
                        <div className="flex items-center gap-2 mb-3">
                            <Badge variant="info">{existingItem.item_code}</Badge>
                            <span className="text-sm font-semibold text-gray-800">{existingItem.name}</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                            <div><span className="text-gray-500">{t('info_category')}</span> <span className="font-medium">{existingItem.category}</span></div>
                            <div><span className="text-gray-500">{t('info_current_stock')}</span> <span className="font-bold text-indigo-700">{existingItem.net_stock}</span></div>
                            <div><span className="text-gray-500">{t('info_price')}</span> <span className="font-medium">{Number(existingItem.unit_price).toFixed(2)}</span></div>
                            <div><span className="text-gray-500">{t('info_min_stock')}</span> <span className="font-medium">{existingItem.min_stock}</span></div>
                        </div>
                    </div>
                )}
            </Card>

            {/* New Item Form */}
            {isNewItem && (
                <Card>
                    <CardHeader title={t('new_item_details')} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        <Input label={t('item_name')} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('placeholder_item_name')} />
                        <Select label={t('item_category')} options={catOptions} value={category} onChange={(e) => setCategory(e.target.value)} placeholder={t('select_category')} />
                        <Select label={t('item_unit')} options={unitOptions} value={unit} onChange={(e) => setUnit(e.target.value)} placeholder={t('select_unit')} />
                        <Input label={t('item_supplier')} value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder={t('placeholder_supplier')} />
                        <Input label={t('starting_balance')} type="number" value={startingBalance} onChange={(e) => setStartingBalance(e.target.value)} placeholder={t('placeholder_starting_balance')} hint={t('hint_starting_balance')} />
                        <Input label={t('unit_price')} type="number" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} placeholder={t('placeholder_price')} />
                        <Input label={t('min_stock')} type="number" value={minStock} onChange={(e) => setMinStock(e.target.value)} placeholder={t('placeholder_min_stock')} />
                        <Input label={t('starting_balance_date')} type="date" value={balanceDate} onChange={(e) => setBalanceDate(e.target.value)} hint={t('hint_balance_date')} />
                    </div>
                    <div className="flex justify-end mt-6 pt-5 border-t border-gray-100">
                        <Button onClick={addItem} loading={loading} size="lg">{t('btn_add_item')}</Button>
                    </div>
                </Card>
            )}

            {/* Update Stock Form */}
            {existingItem && (
                <Card>
                    <CardHeader title={t('update_stock')} />

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        <Select
                            label={t('transaction_type')}
                            value={transactionType}
                            onChange={(e) => setTransactionType(e.target.value)}
                            placeholder={t('select_type')}
                            options={[
                                { value: '\u0648\u0627\u0631\u062f', label: t('type_incoming') },
                                { value: '\u0635\u0627\u062f\u0631', label: t('type_outgoing') },
                                { value: 'transfer', label: t('type_transfer') },
                            ]}
                        />
                        <Input label={t('quantity')} type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder={t('placeholder_quantity')} />
                        <Input label={t('transaction_date')} type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} hint={t('hint_transaction_date')} />

                        {transactionType === '\u0648\u0627\u0631\u062f' && (
                            <>
                                <Input label={t('incoming_supplier')} value={incomingSupplier} onChange={(e) => setIncomingSupplier(e.target.value)} placeholder={t('placeholder_incoming_supplier')} />
                                <Input label={t('shipment_price')} type="number" value={shipmentPrice} onChange={(e) => setShipmentPrice(e.target.value)} placeholder={t('placeholder_shipment_price')} hint={t('hint_price_average')} />
                            </>
                        )}

                        {transactionType === 'transfer' && (
                            <>
                                <Select label={t('transfer_from')} options={factoryOptions} value={transferFrom} onChange={(e) => setTransferFrom(e.target.value)} />
                                <Select label={t('transfer_to')} options={factoryOptions.filter(f => f.value !== transferFrom)} value={transferTo} onChange={(e) => setTransferTo(e.target.value)} placeholder={t('select_location')} />
                            </>
                        )}

                        <Select label={t('filter_document_type')} options={docTypeOptions} value={documentType} onChange={(e) => setDocumentType(e.target.value)} placeholder={t('select_document_type')} />
                        <Input label={t('document_number')} value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} placeholder={t('placeholder_document_number')} />
                    </div>
                    <div className="mt-5">
                        <Textarea label={t('th_notes')} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('placeholder_notes')} />
                    </div>
                    <div className="flex justify-end mt-6 pt-5 border-t border-gray-100">
                        <Button onClick={updateStock} loading={loading} size="lg">{t('btn_update_stock')}</Button>
                    </div>
                </Card>
            )}
        </div>
    );
}
