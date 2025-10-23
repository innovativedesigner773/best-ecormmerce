import React, { useEffect, useRef, useState } from 'react';
import {
  Scan,
  ShoppingCart,
  CreditCard,
  Percent,
  Users,
  Calculator,
  Trash2,
  Plus,
  Minus,
  Receipt,
  DollarSign,
  UserCheck,
  Gift,
  Settings,
  Printer,
  Mail,
  X,
  Delete
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { BrowserMultiFormatReader, type Result } from '@zxing/browser';
import CashierLayout from '../../components/cashier/CashierLayout';
import { useAuth } from '../../contexts/AuthContext';
import { OrderService, type OrderData } from '../../utils/order-service';

type CartItem = {
  id: number;
  name: string;
  price: number;
  category: string;
  barcode: string;
  quantity: number;
  sku?: string;
};

type OnScreenKeyboardProps = {
  onKeyPress: (key: string) => void;
  onClose: () => void;
  target: 'barcode' | 'customer' | 'payment' | 'manual';
};

type Customer = { name: string; email: string; points: number } | null;

export default function EnhancedPOS() {
  const { userProfile } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState<Customer>(null);
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [showKeyboard, setShowKeyboard] = useState<boolean>(false);
  const [keyboardTarget, setKeyboardTarget] = useState<'barcode' | 'customer' | 'payment' | 'manual'>('barcode');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [showDiscountModal, setShowDiscountModal] = useState<boolean>(false);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [activeInput, setActiveInput] = useState<string>('');
  const [productsByBarcode, setProductsByBarcode] = useState<Record<string, any>>({});
  const [productsLoading, setProductsLoading] = useState<boolean>(false);
  const [productsError, setProductsError] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [showReceipt, setShowReceipt] = useState(false);
  const [changeDue, setChangeDue] = useState(0);
  const [transactionId, setTransactionId] = useState('');
  const [transactionDate, setTransactionDate] = useState<Date | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [orderRecord, setOrderRecord] = useState<any>(null);
  const receiptRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const [scanning, setScanning] = useState<boolean>(false);
  const lastScanRef = useRef<{ code: string; at: number } | null>(null);

  // Fetch products like the customer pages (active products)
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setProductsLoading(true);
        setProductsError('');
        const { data, error } = await supabase
          .from('products')
          .select(`
            *,
            category:categories(id, name, slug)
          `)
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const map: Record<string, any> = {};
        (data || []).forEach((p: any) => {
          if (p.barcode) {
            map[p.barcode] = {
              id: p.id,
              name: p.name,
              price: Number(p.price) || 0,
              category: p.category?.name || 'General',
              sku: p.sku,
              barcode: p.barcode,
            };
          }
        });
        setProductsByBarcode(map);
      } catch (err: any) {
        console.error('Failed to load products for POS:', err);
        setProductsError(err?.message || 'Failed to load products');
      } finally {
        setProductsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Initialize / teardown camera scanner with optimized settings
  useEffect(() => {
    if (!scanning) {
      // Stop scanner if running
      if (codeReaderRef.current) {
        try {
          // Check if reset method exists before calling it
          if (typeof codeReaderRef.current.reset === 'function') {
            codeReaderRef.current.reset();
          }
        } catch (error) {
          console.warn('Error resetting scanner:', error);
        }
      }
      return;
    }

    let mounted = true;
    const reader = new BrowserMultiFormatReader();
    codeReaderRef.current = reader;

    const start = async () => {
      try {
        // Start scanning (BrowserMultiFormatReader handles format detection automatically)
        await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current as HTMLVideoElement,
          (result: any, err: any) => {
            if (!mounted) return;
            if (result) {
              const text = result.getText();
              const now = Date.now();
              // Optimized debouncing for faster response (reduced from 800ms to 300ms)
              if (
                !lastScanRef.current ||
                lastScanRef.current.code !== text ||
                now - lastScanRef.current.at > 300
              ) {
                lastScanRef.current = { code: text, at: now };
                handleBarcodeInput(text);
              }
            }
            // Reduced error logging for better performance
            if (err && !err.message?.includes('No MultiFormat Readers')) {
              console.warn('Scanning error:', err);
            }
          }
        );
      } catch (e) {
        console.error('Scanner init error', e);
        setScanning(false);
      }
    };

    start();

    return () => {
      mounted = false;
      try {
        // Check if reset method exists before calling it
        if (typeof reader.reset === 'function') {
          reader.reset();
        }
      } catch (error) {
        console.warn('Error resetting scanner:', error);
      }
    };
  }, [scanning]);

  // Sample customers database
  const customers: Record<string, { name: string; email: string; points: number }> = {
    '0821234567': { name: 'John Smith', email: 'john@email.com', points: 150 },
    '0739876543': { name: 'Sarah Johnson', email: 'sarah@email.com', points: 220 },
    'customer@demo.com': { name: 'Demo Customer', email: 'customer@demo.com', points: 500 }
  };

  const handleBarcodeInput = (value: string) => {
    const product = productsByBarcode[value];
    if (product) {
      const existingItem = cartItems.find((item) => item.barcode === value);
      if (existingItem) {
        setCartItems(cartItems.map((item) =>
          item.barcode === value
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ));
      } else {
        const newItem: CartItem = {
          id: Date.now(),
          name: product.name,
          price: Number(product.price) || 0,
          category: product.category || 'General',
          barcode: value,
          quantity: 1,
          sku: product.sku,
        };
        setCartItems([...cartItems, newItem]);
      }
      setBarcodeInput('');
    }
  };

  const handleCustomerSearch = (query: string) => {
    const foundCustomer = customers[query];
    if (foundCustomer) {
      setCustomer(foundCustomer);
      setCustomerSearch('');
    }
  };

  const updateQuantity = (id: number, change: number) => {
    const updated = cartItems
      .map((item) => {
        if (item.id === id) {
          const newQuantity = item.quantity + change;
          return newQuantity <= 0 ? null : { ...item, quantity: newQuantity };
        }
        return item;
      })
      .filter((i): i is CartItem => i !== null);
    setCartItems(updated);
  };

  const removeItem = (id: number) => {
    setCartItems(cartItems.filter(item => item.id !== id));
  };

  const subtotal = cartItems.reduce((sum: number, item: CartItem) => sum + (item.price * item.quantity), 0);
  const discountAmount = subtotal * (discountPercent / 100);
  const total = subtotal - discountAmount;

  const handleConfirmPayment = async () => {
    if (isProcessingPayment) return;
    
    setIsProcessingPayment(true);
    
    try {
      const amountNumber = Number(paymentAmount || '0');
      const safeAmount = isNaN(amountNumber) ? 0 : amountNumber;
      const computedChange = paymentMethod === 'cash' ? Math.max(safeAmount - total, 0) : 0;
      
      // Generate transaction ID
      const txId = `POS-${Date.now()}`;
      setTransactionId(txId);
      setTransactionDate(new Date());
      setChangeDue(Number(computedChange.toFixed(2)));
      
      // Record the sale in the database
      const orderData: OrderData = {
        customer_id: customer ? null : userProfile?.id, // Use cashier as customer if no customer selected
        customer_email: customer?.email || userProfile?.email || 'pos@bestbrightness.com',
        customer_info: customer ? {
          name: customer.name,
          email: customer.email,
          phone: null
        } : {
          name: `${userProfile?.first_name || 'Cashier'} ${userProfile?.last_name || 'User'}`,
          email: userProfile?.email || 'pos@bestbrightness.com',
          phone: null
        },
        billing_address: null,
        shipping_address: null,
        payment_method: paymentMethod,
        payment_details: {
          amount_tendered: safeAmount,
          change_given: computedChange,
          transaction_id: txId,
          cashier_id: userProfile?.id,
          cashier_name: `${userProfile?.first_name || 'Cashier'} ${userProfile?.last_name || 'User'}`,
          pos_location: 'Store POS'
        },
        subtotal: subtotal,
        tax_amount: 0, // No tax for POS sales
        shipping_amount: 0,
        discount_amount: discountAmount,
        total_amount: total,
        currency: 'ZAR',
        notes: `POS Sale - ${paymentMethod.toUpperCase()} Payment`,
        items: cartItems.map(item => ({
          product_id: productsByBarcode[item.barcode]?.id || null,
          product_snapshot: {
            name: item.name,
            price: item.price,
            image_url: null,
            description: `${item.category} - SKU: ${item.sku || 'N/A'}`,
            category: item.category,
            barcode: item.barcode
          },
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.price * item.quantity,
        })),
        isSharedCartOrder: false,
        isCashierOrder: true // Flag to identify cashier orders
      };

      console.log('🛒 Recording POS sale:', orderData);
      
      // Create the order in the database
      const result = await OrderService.createOrder(orderData);
      
      if (result.success) {
        console.log('✅ POS sale recorded successfully:', result.data);
        setOrderRecord(result.data);
        
        // Close payment modal and show receipt
        setShowPaymentModal(false);
        setShowReceipt(true);
      } else {
        console.error('❌ Failed to record POS sale:', result.error);
        alert(`Failed to record sale: ${result.error}`);
        return;
      }
      
    } catch (error) {
      console.error('❌ Error processing payment:', error);
      alert('Error processing payment. Please try again.');
      return;
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handlePrintReceipt = () => {
    const content = receiptRef.current?.innerHTML || '';
    const printWindow = window.open('', '_blank', 'width=360,height=640');
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(`<!doctype html><html><head><title>Receipt</title>
      <style>
        body { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace; padding: 16px; }
        .receipt { width: 280px; margin: 0 auto; }
        .center { text-align: center; }
        .hr { border-top: 1px dashed #999; margin: 8px 0; }
        .row { display: flex; justify-content: space-between; }
        .small { font-size: 12px; color: #444; }
      </style>
    </head><body onload="window.print();window.close()"><div class="receipt">${content}</div></body></html>`);
    printWindow.document.close();
  };

  const OnScreenKeyboard = ({ onKeyPress, onClose, target }: OnScreenKeyboardProps) => {
    const keys = [
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
      ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
      ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', '@'],
      ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '.', '-', '_']
    ];

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-2xl w-full mx-4">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-[#09215F]">
              {target === 'barcode' ? 'Enter Barcode' : target === 'customer' ? 'Customer Search' : 'Manual Entry'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="mb-6">
            <input
              type="text"
              value={target === 'barcode' ? barcodeInput : target === 'customer' ? customerSearch : paymentAmount}
              readOnly
              className="w-full p-4 text-xl border-2 border-gray-200 rounded-xl bg-gray-50 text-center font-mono"
              placeholder={target === 'barcode' ? 'Barcode will appear here' : target === 'customer' ? 'Search query' : 'Amount'}
            />
          </div>

          <div className="space-y-3">
            {keys.map((row, rowIndex) => (
              <div key={rowIndex} className="flex justify-center space-x-2">
                {row.map((key) => (
                  <button
                    key={key}
                    onClick={() => onKeyPress(key)}
                    className="bg-[#97CF50] text-white p-4 rounded-xl hover:bg-[#09215F] transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1 min-w-[48px] font-semibold"
                  >
                    {key}
                  </button>
                ))}
              </div>
            ))}
          </div>

          <div className="flex justify-center space-x-4 mt-6">
            <button
              onClick={() => onKeyPress('SPACE')}
              className="bg-gray-200 text-[#09215F] px-8 py-4 rounded-xl hover:bg-gray-300 transition-all duration-200 font-semibold"
            >
              Space
            </button>
            <button
              onClick={() => onKeyPress('BACKSPACE')}
              className="bg-red-500 text-white px-6 py-4 rounded-xl hover:bg-red-600 transition-all duration-200 font-semibold flex items-center"
            >
              <Delete className="h-5 w-5 mr-2" />
              Delete
            </button>
            <button
              onClick={() => onKeyPress('ENTER')}
              className="bg-green-500 text-white px-8 py-4 rounded-xl hover:bg-green-600 transition-all duration-200 font-semibold"
            >
              Enter
            </button>
          </div>
        </div>
      </div>
    );
  };

  const handleKeyPress = (key: string) => {
    if (key === 'BACKSPACE') {
      if (keyboardTarget === 'barcode') {
        setBarcodeInput(prev => prev.slice(0, -1));
      } else if (keyboardTarget === 'customer') {
        setCustomerSearch(prev => prev.slice(0, -1));
      } else if (keyboardTarget === 'payment') {
        setPaymentAmount(prev => prev.slice(0, -1));
      }
    } else if (key === 'ENTER') {
      if (keyboardTarget === 'barcode') {
        handleBarcodeInput(barcodeInput);
      } else if (keyboardTarget === 'customer') {
        handleCustomerSearch(customerSearch);
      }
      setShowKeyboard(false);
      setKeyboardTarget('barcode');
    } else if (key === 'SPACE') {
      if (keyboardTarget === 'customer') {
        setCustomerSearch(prev => prev + ' ');
      }
    } else {
      if (keyboardTarget === 'barcode') {
        setBarcodeInput(prev => prev + key);
      } else if (keyboardTarget === 'customer') {
        setCustomerSearch(prev => prev + key);
      } else if (keyboardTarget === 'payment') {
        setPaymentAmount(prev => prev + key);
      }
    }
  };

  const openKeyboard = (target: 'barcode' | 'customer' | 'payment' | 'manual') => {
    setKeyboardTarget(target);
    setShowKeyboard(true);
  };

  return (
    <CashierLayout>
      <div className="min-h-screen bg-gradient-to-br from-[#97CF50]/20 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 bg-white rounded-2xl shadow-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-[#09215F]">Point of Sale</h1>
              <p className="text-[#09215F]/80 mt-2">Process in-store sales and transactions</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-[#97CF50] text-white p-4 rounded-2xl shadow-lg">
                <Scan className="h-8 w-8" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Section - Scanner & Customer */}
          <div className="lg:col-span-2 space-y-6">
            {/* Barcode Scanner */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-2xl font-semibold text-[#09215F] mb-6">Barcode Scanner</h2>
              <div className="border-2 border-dashed border-[#97CF50]/30 rounded-xl p-8 text-center bg-gradient-to-br from-[#97CF50]/10 to-transparent">
                <Scan className="h-16 w-16 text-[#97CF50] mx-auto mb-4" />
                <p className="text-xl font-medium text-[#09215F] mb-2">Ready to Scan</p>
                <p className="text-[#09215F]/80 mb-6">Use barcode scanner or enter product code manually</p>
                <div className="flex space-x-4">
                  <input
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleBarcodeInput(barcodeInput)}
                    placeholder="Enter barcode or product code..."
                    className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#97CF50] focus:border-transparent text-center font-mono"
                  />
                  <button
                    onClick={() => openKeyboard('barcode')}
                    className="bg-[#97CF50] text-white px-6 py-3 rounded-xl hover:bg-[#09215F] transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                  >
                    <Calculator className="h-6 w-6" />
                  </button>
                </div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                  <div className="md:col-span-2">
                    <div className="relative w-full">
                      <video ref={videoRef} className="w-full h-48 bg-gray-100 rounded-xl" muted playsInline />
                      {!scanning && (
                        <div className="absolute inset-0 flex items-center justify-center text-sm text-[#09215F]/70">Camera idle</div>
                      )}
                    </div>
                  </div>
                  <div className="flex md:flex-col gap-3 justify-center">
                    <button
                      onClick={() => setScanning(true)}
                      className="bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 transition-all duration-200 disabled:opacity-60"
                      disabled={scanning}
                    >
                      Start Camera
                    </button>
                    <button
                      onClick={() => setScanning(false)}
                      className="bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition-all duration-200 disabled:opacity-60"
                      disabled={!scanning}
                    >
                      Stop Camera
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Product Buttons */}
              <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-3">
                {productsLoading && (
                  <div className="col-span-5 text-center text-[#09215F]/70">Loading products…</div>
                )}
                {!productsLoading && productsError && (
                  <div className="col-span-5 text-center text-red-600">{productsError}</div>
                )}
                {!productsLoading && !productsError &&
                  Object.entries(productsByBarcode).slice(0, 10).map(([barcode, product]: any) => (
                    <button
                      key={barcode}
                      onClick={() => handleBarcodeInput(barcode)}
                      className="p-4 bg-gradient-to-br from-[#97CF50]/10 to-[#97CF50]/20 rounded-xl hover:from-[#97CF50]/20 hover:to-[#97CF50]/30 transition-all duration-300 border border-[#97CF50]/20 hover:border-[#97CF50]/40"
                    >
                      <div className="text-sm font-semibold text-[#09215F]">{product.name}</div>
                      <div className="text-[#97CF50] font-bold">R{product.price}</div>
                    </button>
                  ))}
              </div>
            </div>

            {/* Customer Search */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-2xl font-semibold text-[#09215F] mb-6">Customer Lookup</h2>
              <div className="flex items-center space-x-4 mb-4">
                <div className="flex-1">
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleCustomerSearch(customerSearch)}
                    placeholder="Search by phone, email, or name..."
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#97CF50] focus:border-transparent"
                  />
                </div>
                <button
                  onClick={() => openKeyboard('customer')}
                  className="bg-[#97CF50] text-white px-4 py-3 rounded-xl hover:bg-[#09215F] transition-all duration-300"
                >
                  <Calculator className="h-6 w-6" />
                </button>
                <button
                  onClick={() => handleCustomerSearch(customerSearch)}
                  className="bg-[#97CF50] text-white px-6 py-3 rounded-xl hover:bg-[#09215F] transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center"
                >
                  <Users className="h-5 w-5 mr-2" />
                  Search
                </button>
              </div>

              {customer && (
                <div className="bg-gradient-to-r from-[#97CF50]/10 to-[#97CF50]/20 rounded-xl p-4 border border-[#97CF50]/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <UserCheck className="h-8 w-8 text-[#97CF50]" />
                      <div>
                        <h3 className="font-bold text-[#09215F]">{customer.name}</h3>
                        <p className="text-[#09215F]/80">{customer.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="bg-[#97CF50] text-white px-4 py-2 rounded-xl">
                        <Gift className="h-5 w-5 inline mr-2" />
                        {customer.points} points
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Section - Cart & Checkout */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-xl p-6 sticky top-4">
              <h2 className="text-2xl font-semibold text-[#09215F] mb-6">Transaction</h2>

              {cartItems.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-[#97CF50]/30 rounded-xl mb-6 bg-gradient-to-br from-[#97CF50]/10 to-transparent">
                  <ShoppingCart className="h-12 w-12 text-[#97CF50] mx-auto mb-3" />
                  <p className="text-[#09215F]">No items scanned</p>
                  <p className="text-sm text-[#09215F]/80 mt-1">Scan products to add to cart</p>
                </div>
              ) : (
                <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
                  {cartItems.map((item) => (
                    <div key={item.id} className="bg-gradient-to-r from-[#97CF50]/10 to-transparent rounded-xl p-4 border border-[#97CF50]/20">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-[#09215F]">{item.name}</h4>
                          <p className="text-sm text-[#09215F]/80">{item.category}</p>
                          <p className="text-[#97CF50] font-bold">R{item.price} each</p>
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="bg-red-500 text-white p-1 rounded-lg hover:bg-red-600"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="font-bold text-[#09215F] min-w-[2rem] text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="bg-green-500 text-white p-1 rounded-lg hover:bg-green-600"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                        <span className="font-bold text-[#09215F]">R{(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick Actions */}
              <div className="space-y-3 mb-6">
                <button
                  onClick={() => setShowDiscountModal(true)}
                  className="w-full flex items-center justify-center px-4 py-3 border-2 border-[#97CF50]/30 rounded-xl hover:bg-[#97CF50]/10 transition-all duration-300 text-[#09215F] font-semibold"
                >
                  <Percent className="h-5 w-5 mr-2" />
                  Apply Discount ({discountPercent}%)
                </button>
                <button
                  onClick={() => openKeyboard('manual')}
                  className="w-full flex items-center justify-center px-4 py-3 border-2 border-[#97CF50]/30 rounded-xl hover:bg-[#97CF50]/10 transition-all duration-300 text-[#09215F] font-semibold"
                >
                  <Calculator className="h-5 w-5 mr-2" />
                  Manual Entry
                </button>
              </div>

              {/* Total Display */}
              <div className="border-t-2 border-[#97CF50]/20 pt-4 mb-6 space-y-2">
                <div className="flex justify-between text-[#09215F]">
                  <span>Subtotal:</span>
                  <span>R{subtotal.toFixed(2)}</span>
                </div>
                {discountPercent > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount ({discountPercent}%):</span>
                    <span>-R{discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-2xl font-bold text-[#09215F] border-t border-gray-200 pt-2">
                  <span>Total:</span>
                  <span>R{total.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Buttons */}
              <div className="space-y-3">
                <button
                  disabled={cartItems.length === 0}
                  onClick={() => { setPaymentMethod('cash'); setShowPaymentModal(true); }}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-4 px-4 rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-300 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-1 font-semibold flex items-center justify-center"
                >
                  <DollarSign className="h-5 w-5 mr-2" />
                  Cash Payment
                </button>
                <button
                  disabled={cartItems.length === 0}
                  onClick={() => { setPaymentMethod('card'); setShowPaymentModal(true); }}
                  className="w-full bg-gradient-to-r from-[#97CF50] to-[#09215F] text-white py-4 px-4 rounded-xl hover:from-[#09215F] hover:to-[#1a252f] transition-all duration-300 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-1 font-semibold flex items-center justify-center"
                >
                  <CreditCard className="h-5 w-5 mr-2" />
                  Card Payment
                </button>
              </div>

              {/* Additional Actions */}
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button className="bg-[#97CF50]/20 text-[#09215F] py-3 px-4 rounded-xl hover:bg-[#97CF50]/30 transition-all duration-300 font-semibold flex items-center justify-center" onClick={handlePrintReceipt}>
                  <Receipt className="h-5 w-5 mr-2" />
                  Print
                </button>
                <button className="bg-[#97CF50]/20 text-[#09215F] py-3 px-4 rounded-xl hover:bg-[#97CF50]/30 transition-all duration-300 font-semibold flex items-center justify-center">
                  <Mail className="h-5 w-5 mr-2" />
                  Email
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Discount Modal */}
        {showDiscountModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
              <h3 className="text-2xl font-bold text-[#09215F] mb-6">Apply Discount</h3>
              <div className="mb-6">
                <label className="block text-sm font-medium text-[#09215F] mb-2">Discount Percentage</label>
                <input
                  type="number"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(Number(e.target.value))}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#97CF50] focus:border-transparent"
                  placeholder="Enter discount percentage..."
                  min="0"
                  max="100"
                />
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={() => setShowDiscountModal(false)}
                  className="flex-1 bg-gray-200 text-[#09215F] py-3 px-4 rounded-xl hover:bg-gray-300 transition-all duration-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowDiscountModal(false)}
                  className="flex-1 bg-[#97CF50] text-white py-3 px-4 rounded-xl hover:bg-[#09215F] transition-all duration-300 font-semibold"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}

        {/* On-Screen Keyboard */}
        {showKeyboard && (
          <OnScreenKeyboard
            onKeyPress={handleKeyPress}
            onClose={() => {
              setShowKeyboard(false);
              setKeyboardTarget('barcode');
            }}
            target={keyboardTarget}
          />
        )}

        {/* Payment Modal (Dummy, non-persistent) */}
        {showPaymentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-[#09215F]">Enter Payment</h3>
                <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[#09215F]">Total Due</span>
                  <span className="text-2xl font-bold text-[#09215F]">R{total.toFixed(2)}</span>
                </div>

                <div className="flex items-center space-x-2">
                  <button onClick={() => setPaymentMethod('cash')} className={`flex-1 px-4 py-3 rounded-xl border-2 ${paymentMethod === 'cash' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-[#09215F]'} font-semibold`}>Cash</button>
                  <button onClick={() => setPaymentMethod('card')} className={`flex-1 px-4 py-3 rounded-xl border-2 ${paymentMethod === 'card' ? 'border-[#97CF50] bg-[#97CF50]/20 text-[#09215F]' : 'border-gray-200 text-[#09215F]'} font-semibold`}>Card</button>
                </div>

                {paymentMethod === 'cash' && (
                  <div>
                    <label className="block text-sm font-medium text-[#09215F] mb-2">Amount Tendered</label>
                    <div className="flex space-x-2">
                      <input
                        type="number"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder="Enter cash received"
                        className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#97CF50] focus:border-transparent"
                        min="0"
                        step="0.01"
                      />
                      <button onClick={() => openKeyboard('payment')} className="bg-[#97CF50] text-white px-4 py-3 rounded-xl hover:bg-[#09215F] transition-all duration-300">
                        <Calculator className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )}

                {paymentMethod === 'cash' && paymentAmount && Number(paymentAmount) >= 0 && (
                  <div className="flex items-center justify-between text-[#09215F]">
                    <span>Change (if any)</span>
                    <span className="font-bold">R{Math.max(Number(paymentAmount || '0') - total, 0).toFixed(2)}</span>
                  </div>
                )}

                <div className="flex space-x-4 pt-2">
                  <button 
                    onClick={() => setShowPaymentModal(false)} 
                    disabled={isProcessingPayment}
                    className="flex-1 bg-gray-200 text-[#09215F] py-3 px-4 rounded-xl hover:bg-gray-300 transition-all duration-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleConfirmPayment} 
                    disabled={isProcessingPayment}
                    className="flex-1 bg-green-600 text-white py-3 px-4 rounded-xl hover:bg-green-700 transition-all duration-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {isProcessingPayment ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      'Confirm Payment'
                    )}
                  </button>
                </div>
                <p className="text-xs text-[#09215F]/70">Note: This is a demo payment. No data will be saved.</p>
              </div>
            </div>
          </div>
        )}

        {/* Receipt Modal */}
        {showReceipt && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-[#09215F]">Receipt</h3>
                <button onClick={() => setShowReceipt(false)} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div ref={receiptRef} className="text-sm text-[#09215F]">
                <div className="text-center mb-2">
                  <div className="font-extrabold text-[#97CF50]">BEST BRIGHTNESS</div>
                  <div className="small text-[#09215F]/80">Point of Sale Receipt</div>
                  <div className="small text-[#97CF50]">Your Bright Shopping Experience</div>
                </div>
                <div className="hr" />
                <div className="flex justify-between text-xs"><span>Order #</span><span>{orderRecord?.order_number || transactionId}</span></div>
                <div className="flex justify-between text-xs"><span>Date</span><span>{transactionDate ? transactionDate.toLocaleString() : ''}</span></div>
                <div className="flex justify-between text-xs"><span>Cashier</span><span>{userProfile ? `${userProfile.first_name} ${userProfile.last_name}` : 'System User'}</span></div>
                {customer && (
                  <div className="flex justify-between text-xs"><span>Customer</span><span>{customer.name}</span></div>
                )}
                <div className="hr" />
                {cartItems.map((item) => (
                  <div key={item.id}>
                    <div className="flex justify-between"><span>{item.name} x{item.quantity}</span><span>R{(item.price * item.quantity).toFixed(2)}</span></div>
                    <div className="text-xs text-[#09215F]/70 ml-2">R{item.price.toFixed(2)} each</div>
                  </div>
                ))}
                <div className="hr" />
                <div className="flex justify-between"><span>Subtotal</span><span>R{subtotal.toFixed(2)}</span></div>
                {discountPercent > 0 && (
                  <div className="flex justify-between text-xs text-green-600"><span>Discount {discountPercent}%</span><span>-R{discountAmount.toFixed(2)}</span></div>
                )}
                <div className="flex justify-between font-bold text-[#97CF50]"><span>Total</span><span>R{total.toFixed(2)}</span></div>
                <div className="flex justify-between text-xs"><span>Payment Method</span><span>{paymentMethod.toUpperCase()}</span></div>
                {paymentMethod === 'cash' && (
                  <>
                    <div className="flex justify-between text-xs"><span>Amount Tendered</span><span>R{Number(paymentAmount || '0').toFixed(2)}</span></div>
                    <div className="flex justify-between text-xs"><span>Change</span><span>R{changeDue.toFixed(2)}</span></div>
                  </>
                )}
                <div className="hr" />
                <div className="text-center text-xs text-[#97CF50]">Thank you for shopping with us!</div>
                <div className="text-center text-xs text-[#09215F]/70">Visit us again soon</div>
                {orderRecord && (
                  <div className="text-center text-xs text-[#09215F]/50 mt-2">Order ID: {orderRecord.id}</div>
                )}
              </div>

              <div className="mt-4 flex space-x-3">
                <button onClick={() => { const el = document.activeElement as HTMLElement | null; el?.blur(); setTimeout(() => { /* small delay for UI */ }, 0); window.setTimeout(() => { }, 0); }} className="hidden" />
                <button onClick={() => { const el = document.activeElement as HTMLElement | null; el?.blur(); setTimeout(() => { }, 0); }} className="hidden" />
                <button onClick={() => { const el = document.activeElement as HTMLElement | null; el?.blur(); setTimeout(() => { }, 0); }} className="hidden" />
                <button onClick={() => { const el = document.activeElement as HTMLElement | null; el?.blur(); setTimeout(() => { }, 0); }} className="hidden" />
                <button onClick={() => { const el = document.activeElement as HTMLElement | null; el?.blur(); setTimeout(() => { }, 0); }} className="hidden" />
                <button onClick={() => { const el = document.activeElement as HTMLElement | null; el?.blur(); setTimeout(() => { }, 0); }} className="hidden" />
                <button onClick={() => { const el = document.activeElement as HTMLElement | null; el?.blur(); setTimeout(() => { }, 0); }} className="hidden" />
                <button onClick={() => { const el = document.activeElement as HTMLElement | null; el?.blur(); setTimeout(() => { }, 0); }} className="hidden" />
                <button onClick={() => { const el = document.activeElement as HTMLElement | null; el?.blur(); setTimeout(() => { }, 0); }} className="hidden" />
                <button onClick={() => { const el = document.activeElement as HTMLElement | null; el?.blur(); setTimeout(() => { }, 0); }} className="hidden" />
                <button onClick={() => { const el = document.activeElement as HTMLElement | null; el?.blur(); setTimeout(() => { }, 0); }} className="hidden" />
                <button onClick={() => { const el = document.activeElement as HTMLElement | null; el?.blur(); setTimeout(() => { }, 0); }} className="hidden" />
                <button onClick={() => { const el = document.activeElement as HTMLElement | null; el?.blur(); setTimeout(() => { }, 0); }} className="hidden" />
                <button onClick={() => { const el = document.activeElement as HTMLElement | null; el?.blur(); setTimeout(() => { }, 0); }} className="hidden" />
                <button onClick={() => { const el = document.activeElement as HTMLElement | null; el?.blur(); setTimeout(() => { }, 0); }} className="hidden" />
                <button onClick={() => { const el = document.activeElement as HTMLElement | null; el?.blur(); setTimeout(() => { }, 0); }} className="hidden" />
                <button onClick={() => { const el = document.activeElement as HTMLElement | null; el?.blur(); setTimeout(() => { }, 0); }} className="hidden" />
                <button onClick={() => { const el = document.activeElement as HTMLElement | null; el?.blur(); setTimeout(() => { }, 0); }} className="hidden" />
                <button onClick={() => { const el = document.activeElement as HTMLElement | null; el?.blur(); setTimeout(() => { }, 0); }} className="hidden" />
                <button onClick={() => { const el = document.activeElement as HTMLElement | null; el?.blur(); setTimeout(() => { }, 0); }} className="hidden" />
                <button onClick={() => { const el = document.activeElement as HTMLElement | null; el?.blur(); setTimeout(() => { }, 0); }} className="hidden" />
                <button onClick={() => { const el = document.activeElement as HTMLElement | null; el?.blur(); setTimeout(() => { }, 0); }} className="hidden" />
                <button onClick={() => { const el = document.activeElement as HTMLElement | null; el?.blur(); setTimeout(() => { }, 0); }} className="hidden" />
                <button onClick={() => { const el = document.activeElement as HTMLElement | null; el?.blur(); setTimeout(() => { }, 0); }} className="hidden" />
                <button onClick={() => { const el = document.activeElement as HTMLElement | null; el?.blur(); setTimeout(() => { }, 0); }} className="hidden" />
                <button onClick={handlePrintReceipt} className="flex-1 bg-[#97CF50] text-white py-2 rounded-xl hover:bg-[#09215F] transition-all duration-300 font-semibold flex items-center justify-center">
                  <Printer className="h-5 w-5 mr-2" />
                  Print
                </button>
                <button 
                  onClick={() => { 
                    setShowReceipt(false); 
                    setCartItems([]); 
                    setPaymentAmount(''); 
                    setPaymentMethod('cash'); 
                    setDiscountPercent(0);
                    setCustomer(null);
                    setOrderRecord(null);
                    setTransactionId('');
                    setTransactionDate(null);
                    setChangeDue(0);
                  }} 
                  className="flex-1 bg-gray-200 text-[#09215F] py-2 rounded-xl hover:bg-gray-300 transition-all duration-300 font-semibold"
                >
                  New Sale
                </button>
              </div>
              <p className="mt-2 text-xs text-[#09215F]/70">Sale recorded successfully in the system.</p>
            </div>
          </div>
        )}
        </div>
      </div>
    </CashierLayout>
  );
}