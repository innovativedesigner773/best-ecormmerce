import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom';
import { CreditCard, Truck, MapPin, Check, ArrowLeft, Package, ShoppingBag } from 'lucide-react';
// import { Elements } from '@stripe/react-stripe-js';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { OrderService, OrderData } from '../../utils/order-service';
import { ShareableCartService, ShareableCart } from '../../utils/shareable-cart';
import { sendOrderConfirmation } from '../../utils/order-email-integration';
// import { getStripe } from '../../config/stripe';
// import StripePaymentForm from '../../components/payment/StripePaymentForm';
import CustomPaymentForm from '../../components/payment/CustomPaymentForm';
import AddressSelector from '../../components/address/AddressSelector';
import { Address } from '../../utils/address-service';
import { toast } from 'sonner';


export default function Checkout() {
  const { items, subtotal, discount_amount, total, loyalty_points_used, loyalty_discount, clearCart } = useCart();
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  // Check if this is a shared cart checkout
  const sharedCartTokenFromUrl = searchParams.get('shared');
  const isSharedCart = location.state?.isSharedCart || !!sharedCartTokenFromUrl;
  const sharedCartToken = location.state?.sharedCartToken || sharedCartTokenFromUrl;
  const [sharedCart, setSharedCart] = useState<ShareableCart | null>(null);
  const [sharedCartLoading, setSharedCartLoading] = useState(false);

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [useManualEntry, setUseManualEntry] = useState(false);
  
  const [shippingInfo, setShippingInfo] = useState({
    firstName: userProfile?.first_name || '',
    lastName: userProfile?.last_name || '',
    email: user?.email || '',
    phone: userProfile?.phone || '',
    address: '',
    city: '',
    postalCode: '',
    province: '',
  });

  const [paymentInfo, setPaymentInfo] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardName: '',
  });

  const [stripePaymentMethodId, setStripePaymentMethodId] = useState<string>('');

  // Calculate totals based on whether it's a shared cart or regular cart
  const cartItems = isSharedCart && sharedCart ? sharedCart.cart_data.items : items;
  const cartSubtotal = isSharedCart && sharedCart ? sharedCart.cart_data.subtotal : subtotal;
  const cartDiscount = isSharedCart && sharedCart ? sharedCart.cart_data.discount_amount : discount_amount;
  const cartTotal = isSharedCart && sharedCart ? sharedCart.cart_data.total : total;
  
  const shippingCost = cartTotal >= 500 ? 0 : 50;
  const finalTotal = cartTotal + shippingCost;

  // Load shared cart data if this is a shared cart checkout
  useEffect(() => {
    if (isSharedCart && sharedCartToken) {
      loadSharedCart();
    }
  }, [isSharedCart, sharedCartToken]);

  // Sync form data when userProfile loads
  useEffect(() => {
    if (userProfile) {
      setShippingInfo(prev => ({
        ...prev,
        firstName: userProfile.first_name || '',
        lastName: userProfile.last_name || '',
        phone: userProfile.phone || '',
      }));
    }
  }, [userProfile]);

  // Sync shipping info when selected address changes
  useEffect(() => {
    if (selectedAddress && !useManualEntry) {
      setShippingInfo(prev => ({
        ...prev,
        firstName: selectedAddress.firstName,
        lastName: selectedAddress.lastName,
        email: selectedAddress.email,
        phone: selectedAddress.phone,
        address: selectedAddress.address,
        city: selectedAddress.city,
        postalCode: selectedAddress.postalCode,
        province: selectedAddress.province,
      }));
    }
  }, [selectedAddress, useManualEntry]);

  // Handle address selection
  const handleAddressSelect = (address: Address) => {
    console.log('🏠 Address selected:', address);
    setSelectedAddress(address);
    setUseManualEntry(false);
  };

  // Handle manual entry toggle
  const handleManualEntryToggle = () => {
    setUseManualEntry(!useManualEntry);
    if (!useManualEntry) {
      // Clear selected address when switching to manual entry
      setSelectedAddress(null);
    }
  };

  const loadSharedCart = async () => {
    if (!sharedCartToken) return;
    
    setSharedCartLoading(true);
    try {
      const result = await ShareableCartService.getShareableCartByToken(sharedCartToken);
      if (result.success && result.data) {
        setSharedCart(result.data);
      } else {
        toast.error(result.error || 'Failed to load shared cart');
        navigate('/');
      }
    } catch (error) {
      console.error('Error loading shared cart:', error);
      toast.error('Failed to load shared cart');
      navigate('/');
    } finally {
      setSharedCartLoading(false);
    }
  };

  const steps = [
    { id: 1, name: 'Shipping', icon: Truck },
    { id: 2, name: 'Payment', icon: CreditCard },
    { id: 3, name: 'Review', icon: Check },
  ];

  const provinces = [
    'Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal',
    'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape', 'Western Cape'
  ];

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // For logged-in users with selected address, validate that address is selected
    if (!isSharedCart && user && !useManualEntry && !selectedAddress) {
      toast.error('Please select a delivery address or enter one manually');
      return;
    }
    
    // For shared carts or manual entry, validate shipping info fields
    if (isSharedCart || useManualEntry) {
      const required = ['firstName', 'lastName', 'email', 'phone', 'address', 'city', 'postalCode', 'province'];
      const missing = required.filter(field => !shippingInfo[field as keyof typeof shippingInfo]);
      
      if (missing.length > 0) {
        toast.error(`Please fill in all required fields: ${missing.join(', ')}`);
        return;
      }
    }

    setCurrentStep(2);
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate payment info
    const required = ['cardNumber', 'expiryDate', 'cvv', 'cardName'];
    const missing = required.filter(field => !paymentInfo[field as keyof typeof paymentInfo]);
    
    if (missing.length > 0) {
      toast.error(`Please fill in all payment fields: ${missing.join(', ')}`);
      return;
    }

    // Basic card number validation
    if (paymentInfo.cardNumber.replace(/\s/g, '').length < 13) {
      toast.error('Please enter a valid card number');
      return;
    }

    setCurrentStep(3);
  };

  const handleStripePaymentSuccess = (paymentMethodId: string) => {
    setStripePaymentMethodId(paymentMethodId);
    toast.success('Payment method verified successfully!');
    setCurrentStep(3);
  };

  const handleStripePaymentError = (error: string) => {
    toast.error(error);
  };

  const handlePlaceOrder = async () => {
    setLoading(true);
    
    try {
      // Prepare order data
      const orderData: OrderData = {
        customer_id: isSharedCart ? null : userProfile?.id, // No user ID for shared cart
        customer_email: shippingInfo.email, // Use shipping email for shared cart
        customer_info: {
          first_name: shippingInfo.firstName,
          last_name: shippingInfo.lastName,
          phone: shippingInfo.phone,
        },
        billing_address: {
          first_name: shippingInfo.firstName,
          last_name: shippingInfo.lastName,
          email: shippingInfo.email,
          phone: shippingInfo.phone,
          address: shippingInfo.address,
          city: shippingInfo.city,
          postal_code: shippingInfo.postalCode,
          province: shippingInfo.province,
        },
        shipping_address: {
          first_name: shippingInfo.firstName,
          last_name: shippingInfo.lastName,
          email: shippingInfo.email,
          phone: shippingInfo.phone,
          address: shippingInfo.address,
          city: shippingInfo.city,
          postal_code: shippingInfo.postalCode,
          province: shippingInfo.province,
        },
        payment_method: 'credit_card',
        payment_details: {
          card_name: paymentInfo.cardName || shippingInfo.firstName + ' ' + shippingInfo.lastName,
          // Note: In production, never store actual card details
          card_last_four: paymentInfo.cardNumber.slice(-4) || '****',
          stripe_payment_method_id: stripePaymentMethodId,
        },
        subtotal: cartSubtotal,
        shipping_amount: shippingCost,
        discount_amount: cartDiscount,
        total_amount: finalTotal,
        currency: 'USD',
        items: cartItems.map(item => ({
          product_id: item.product_id,
          product_snapshot: {
            name: item.name,
            price: item.price,
            image_url: item.image_url,
            description: item.description,
            category: item.category,
          },
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.price * item.quantity,
        })),
      };

      // Create the order in the database
      const result = await OrderService.createOrder(orderData);
      
      if (result.success) {
        // If this is a shared cart, mark it as paid
        if (isSharedCart && sharedCartToken) {
          await ShareableCartService.markAsPaid(sharedCartToken, result.data?.id || '');
        }
        
        const orderNumber = result.data?.order_number || 'Unknown';
        const orderId = result.data?.id;
        
        // Send order confirmation email
        try {
          console.log('📧 Sending order confirmation email...');
          
          // Prepare order data for email
          const emailOrderData = {
            id: orderId,
            customer_email: shippingInfo.email,
            customer_name: `${shippingInfo.firstName} ${shippingInfo.lastName}`,
            order_number: orderNumber,
            order_date: new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),
            status: 'Processing',
            payment_method: 'Credit Card', // You can make this dynamic based on payment info
            items: cartItems.map(item => ({
              product_id: item.product_id,
              name: item.name,
              sku: item.product_id, // You might want to add SKU to your product data
              quantity: item.quantity,
              price: item.price,
              image_url: item.image_url || 'https://via.placeholder.com/300x300?text=Product+Image'
            })),
            subtotal: subtotal,
            shipping_cost: 0, // Free shipping for now
            discount_amount: discount_amount || 0,
            discount_code: '', // Add discount code if applicable
            tax_amount: 0, // You can calculate tax if needed
            total_amount: total,
            shipping_address: {
              name: `${shippingInfo.firstName} ${shippingInfo.lastName}`,
              line1: shippingInfo.address,
              line2: '',
              city: shippingInfo.city,
              state: shippingInfo.province,
              zip: shippingInfo.postalCode,
              country: 'South Africa' // Default to South Africa
            },
            estimated_delivery_days: 3
          };
          
          const emailResult = await sendOrderConfirmation(emailOrderData);
          
          if (emailResult.success) {
            console.log('✅ Order confirmation email sent successfully');
            toast.success(`Order ${orderNumber} placed successfully! Confirmation email sent.`);
          } else {
            console.warn('⚠️ Order placed but email failed:', emailResult.error);
            toast.success(`Order ${orderNumber} placed successfully! (Email notification failed)`);
          }
        } catch (emailError) {
          console.error('❌ Error sending order confirmation email:', emailError);
          toast.success(`Order ${orderNumber} placed successfully! (Email notification failed)`);
        }
        
        if (isSharedCart) {
          // For shared cart, redirect to home with success message
          navigate('/', { 
            state: { 
              message: `Order ${orderNumber} placed successfully! Thank you for your purchase.`,
            } 
          });
        } else {
          // Clear cart and navigate to orders for regular checkout
          await clearCart();
          navigate('/orders');
        }
      } else {
        // Show specific error message
        const errorMessage = result.error || 'Failed to create order';
        if (errorMessage.includes('Insufficient stock')) {
          toast.error(`Stock issue: ${errorMessage}`);
        } else {
          toast.error(`Order failed: ${errorMessage}`);
        }
        throw new Error(errorMessage);
      }
      
    } catch (error) {
      console.error('Error placing order:', error);
      toast.error('Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Show loading if this is a shared cart and we're still loading
  if (isSharedCart && sharedCartLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="bg-primary text-primary-foreground p-4 rounded-2xl shadow-lg inline-block mb-4">
            <Package className="h-8 w-8" />
          </div>
          <LoadingSpinner size="large" />
          <p className="mt-4 text-[#09215F] font-medium">Loading shared cart...</p>
        </div>
      </div>
    );
  }

  // Redirect if cart is empty
  if (cartItems.length === 0) {
    if (isSharedCart) {
      navigate('/');
    } else {
      navigate('/cart');
    }
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <button
            onClick={() => isSharedCart ? navigate('/') : navigate('/cart')}
            className="inline-flex items-center text-[#97CF50] hover:text-[#09215F] mb-6 transition-colors duration-300"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            {isSharedCart ? 'Back to Home' : 'Back to Cart'}
          </button>
          <div className="bg-primary text-primary-foreground p-4 rounded-2xl shadow-lg inline-block mb-4">
            <Package className="h-8 w-8" />
          </div>
          <h1 className="text-4xl font-bold text-[#09215F] mb-2">
            {isSharedCart ? 'Shared Cart Checkout' : 'Secure Checkout'}
          </h1>
          <p className="text-[#09215F]/80 text-lg">
            {isSharedCart 
              ? `Complete the purchase for ${sharedCart?.cart_metadata?.original_user_name || 'this shared cart'}`
              : 'Complete your order for professional cleaning supplies'
            }
          </p>
          {isSharedCart && sharedCart?.cart_metadata?.message && (
            <p className="text-[#97CF50] text-sm italic mt-2">
              "{sharedCart.cart_metadata.message}"
            </p>
          )}
        </div>

        {/* Progress Steps */}
        <div className="mb-12">
          <div className="flex items-center justify-center space-x-8">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300 ${
                  currentStep >= step.id 
                    ? 'bg-primary text-primary-foreground shadow-lg' 
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  <step.icon className="h-6 w-6" />
                </div>
                <span className={`ml-3 font-semibold text-lg transition-colors duration-300 ${
                  currentStep >= step.id ? 'text-[#97CF50]' : 'text-gray-400'
                }`}>
                  {step.name}
                </span>
                {index < steps.length - 1 && (
                  <div className={`w-20 h-2 ml-6 rounded-full transition-all duration-300 ${
                    currentStep > step.id ? 'bg-[#97CF50]' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Step 1: Shipping Information */}
            {currentStep === 1 && (
              <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-8">
                <div className="flex items-center mb-6">
                  <div className="bg-primary text-primary-foreground p-3 rounded-xl mr-4">
                    <Truck className="h-6 w-6" />
                  </div>
                  <h2 className="text-2xl font-bold text-[#09215F]">Shipping Information</h2>
                </div>
                
                {/* Address Selector for logged-in users */}
                {!isSharedCart && user && (
                  <div className="mb-6">
                    <AddressSelector
                      onAddressSelect={handleAddressSelect}
                      selectedAddress={selectedAddress}
                      showAddNew={true}
                      className="mb-4"
                      userProfile={userProfile}
                    />
                    
                    {selectedAddress && (
                      <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                        <div className="flex items-center">
                          <Check className="h-5 w-5 text-green-600 mr-2" />
                          <span className="text-[#09215F] font-medium">
                            Using selected address: {selectedAddress.label || 'Default'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleManualEntryToggle}
                          className="text-[#97CF50] hover:text-[#09215F] font-medium transition-colors duration-300"
                        >
                          Enter Different Address
                        </button>
                      </div>
                    )}
                    
                    {!selectedAddress && !useManualEntry && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
                        <p className="text-[#09215F] font-medium mb-2">No saved addresses found</p>
                        <button
                          type="button"
                          onClick={handleManualEntryToggle}
                          className="text-[#97CF50] hover:text-[#09215F] font-medium transition-colors duration-300"
                        >
                          Enter Address Manually
                        </button>
                      </div>
                    )}
                  </div>
                )}
                
                <form onSubmit={handleShippingSubmit} className="space-y-6">
                  {/* Show manual entry form only for shared carts or when manual entry is enabled */}
                  {(isSharedCart || useManualEntry) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-[#09215F] mb-3">
                          First Name *
                        </label>
                        <input
                          type="text"
                          value={shippingInfo.firstName}
                          onChange={(e) => setShippingInfo({...shippingInfo, firstName: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#97CF50] focus:border-transparent transition-all duration-300"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-[#09215F] mb-3">
                          Last Name *
                        </label>
                        <input
                          type="text"
                          value={shippingInfo.lastName}
                          onChange={(e) => setShippingInfo({...shippingInfo, lastName: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#97CF50] focus:border-transparent transition-all duration-300"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-[#09215F] mb-3">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          value={shippingInfo.email}
                          onChange={(e) => setShippingInfo({...shippingInfo, email: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#97CF50] focus:border-transparent transition-all duration-300"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-[#09215F] mb-3">
                          Phone Number *
                        </label>
                        <input
                          type="tel"
                          value={shippingInfo.phone}
                          onChange={(e) => setShippingInfo({...shippingInfo, phone: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#97CF50] focus:border-transparent transition-all duration-300"
                          placeholder="+27 12 345 6789"
                          required
                        />
                      </div>
                      
                      <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-[#09215F] mb-3">
                          Street Address *
                        </label>
                        <input
                          type="text"
                          value={shippingInfo.address}
                          onChange={(e) => setShippingInfo({...shippingInfo, address: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#97CF50] focus:border-transparent transition-all duration-300"
                          placeholder="123 Main Street"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-[#09215F] mb-3">
                          City *
                        </label>
                        <input
                          type="text"
                          value={shippingInfo.city}
                          onChange={(e) => setShippingInfo({...shippingInfo, city: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#97CF50] focus:border-transparent transition-all duration-300"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-[#09215F] mb-3">
                          Postal Code *
                        </label>
                        <input
                          type="text"
                          value={shippingInfo.postalCode}
                          onChange={(e) => setShippingInfo({...shippingInfo, postalCode: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#97CF50] focus:border-transparent transition-all duration-300"
                          placeholder="8001"
                          required
                        />
                      </div>
                      
                      <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-[#09215F] mb-3">
                          Province *
                        </label>
                        <select
                          value={shippingInfo.province}
                          onChange={(e) => setShippingInfo({...shippingInfo, province: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#97CF50] focus:border-transparent transition-all duration-300"
                          required
                        >
                          <option value="">Select Province</option>
                          {provinces.map(province => (
                            <option key={province} value={province}>{province}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-8">
                    <button
                      type="submit"
                      className="w-full bg-primary text-primary-foreground py-4 px-6 rounded-xl hover:bg-secondary transition-all duration-300 text-lg font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                    >
                      Continue to Payment
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Step 2: Payment Information */}
            {currentStep === 2 && (
              <>
                <CustomPaymentForm
                  amount={finalTotal}
                  currency="zar"
                  onSuccess={handleStripePaymentSuccess}
                  onError={handleStripePaymentError}
                  onBack={() => setCurrentStep(1)}
                  customerEmail={shippingInfo.email}
                  customerName={`${shippingInfo.firstName} ${shippingInfo.lastName}`}
                />
              </>
            )}

            {/* Step 3: Order Review */}
            {currentStep === 3 && (
              <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-8">
                <div className="flex items-center mb-6">
                  <div className="bg-primary text-primary-foreground p-3 rounded-xl mr-4">
                    <Check className="h-6 w-6" />
                  </div>
                  <h2 className="text-2xl font-bold text-[#09215F]">Review Your Order</h2>
                </div>
                
                {/* Shipping Info Review */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-[#09215F] mb-4 flex items-center">
                    <MapPin className="h-5 w-5 mr-2 text-[#97CF50]" />
                    Shipping Address
                  </h3>
                  <div className="bg-gray-50 border border-gray-200 p-6 rounded-xl">
                    <p className="font-semibold text-[#09215F] text-lg">{shippingInfo.firstName} {shippingInfo.lastName}</p>
                    <p className="text-[#09215F]/80 mt-1">{shippingInfo.address}</p>
                    <p className="text-[#09215F]/80">{shippingInfo.city}, {shippingInfo.province} {shippingInfo.postalCode}</p>
                    <p className="text-[#09215F]/80">{shippingInfo.phone}</p>
                  </div>
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="text-[#97CF50] hover:text-[#09215F] font-medium mt-3 transition-colors duration-300"
                  >
                    Edit Shipping Information
                  </button>
                </div>

                {/* Payment Info Review */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-[#09215F] mb-4 flex items-center">
                    <CreditCard className="h-5 w-5 mr-2 text-[#97CF50]" />
                    Payment Method
                  </h3>
                  <div className="bg-gray-50 border border-gray-200 p-6 rounded-xl">
                    <p className="font-semibold text-[#09215F] text-lg">Card Payment via Stripe</p>
                    <p className="text-[#09215F]/80 mt-1">Payment method verified ✓</p>
                    {stripePaymentMethodId && (
                      <p className="text-xs text-gray-500 mt-2">Payment ID: {stripePaymentMethodId.substring(0, 20)}...</p>
                    )}
                  </div>
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="text-[#97CF50] hover:text-[#09215F] font-medium mt-3 transition-colors duration-300"
                  >
                    Edit Payment Information
                  </button>
                </div>

                <div className="flex space-x-4">
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="flex-1 border-2 border-primary text-primary py-4 px-6 rounded-xl hover:bg-primary hover:text-primary-foreground transition-all duration-300 text-lg font-semibold"
                  >
                    Back
                  </button>
                  <button
                    onClick={handlePlaceOrder}
                    disabled={loading}
                    className="flex-1 bg-green-600 text-white py-4 px-6 rounded-xl hover:bg-green-700 transition-all duration-300 disabled:opacity-50 flex items-center justify-center text-lg font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                  >
                    {loading ? (
                      <LoadingSpinner size="small" />
                    ) : (
                      'Complete Order'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-8 sticky top-4">
              <div className="flex items-center mb-6">
                <div className="bg-primary text-primary-foreground p-3 rounded-xl mr-4">
                  <ShoppingBag className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-bold text-[#09215F]">Order Summary</h2>
              </div>
              
              {/* Items */}
              <div className="space-y-4 mb-6 max-h-80 overflow-y-auto">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <ImageWithFallback
                      src={item.image_url || 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=60&h=60&fit=crop'}
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded-xl shadow-md"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#09215F] truncate">{item.name}</p>
                      <p className="text-sm text-[#09215F]/60">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-lg font-bold text-[#09215F]">R{(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>
              
              {/* Totals */}
              <div className="border-t border-gray-200 pt-6 space-y-4">
                <div className="flex justify-between text-lg">
                  <span className="text-[#09215F]/80">Subtotal</span>
                  <span className="font-semibold text-[#09215F]">R{cartSubtotal.toFixed(2)}</span>
                </div>
                
                {cartDiscount > 0 && (
                  <div className="flex justify-between text-lg">
                    <span className="text-green-600">Discounts</span>
                    <span className="text-green-600 font-semibold">-R{cartDiscount.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="flex justify-between text-lg">
                  <span className="text-[#09215F]/80">Shipping</span>
                  <span className="font-semibold text-[#09215F]">
                    {shippingCost === 0 ? (
                      <span className="text-green-600">FREE</span>
                    ) : (
                      `R${shippingCost.toFixed(2)}`
                    )}
                  </span>
                </div>
                
                <div className="flex justify-between text-2xl font-bold pt-4 border-t border-gray-200 text-[#09215F]">
                  <span>Total</span>
                  <span>R{finalTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Security Badge */}
              <div className="mt-8 text-center">
                <div className="flex items-center justify-center text-[#09215F]/60 bg-gray-50 py-3 px-4 rounded-xl border border-gray-200">
                  <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  <span className="font-semibold">256-bit SSL Encryption</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}