import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Scale, FileText, AlertTriangle, CreditCard, Truck, RotateCcw, Shield, Phone } from 'lucide-react';

const TermsOfService: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Scale className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms of Service</h1>
          <p className="text-xl text-gray-600">
            Please read these terms carefully before using our services.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        <div className="space-y-8">
          {/* Introduction */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-600" />
                Agreement to Terms
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">
                These Terms of Service ("Terms") govern your use of the Best Brightness website, 
                mobile application, and services (collectively, the "Service") operated by Best 
                Brightness (Pty) Ltd ("we," "our," or "us").
              </p>
              <p className="text-gray-700 leading-relaxed mt-4">
                By accessing or using our Service, you agree to be bound by these Terms. If you 
                disagree with any part of these terms, then you may not access the Service.
              </p>
            </CardContent>
          </Card>

          {/* Acceptance of Terms */}
          <Card>
            <CardHeader>
              <CardTitle>Acceptance of Terms</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">
                By creating an account, making a purchase, or using our services, you acknowledge 
                that you have read, understood, and agree to be bound by these Terms and our 
                Privacy Policy. These Terms constitute a legally binding agreement between you 
                and Best Brightness.
              </p>
            </CardContent>
          </Card>

          {/* Use of Service */}
          <Card>
            <CardHeader>
              <CardTitle>Use of Service</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Permitted Use</h3>
                  <p className="text-gray-700">You may use our Service for lawful purposes only. You agree to:</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 mt-2">
                    <li>Provide accurate and complete information when creating an account</li>
                    <li>Maintain the security of your account credentials</li>
                    <li>Use the Service in compliance with all applicable laws and regulations</li>
                    <li>Respect the intellectual property rights of others</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Prohibited Use</h3>
                  <p className="text-gray-700">You may not use our Service to:</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 mt-2">
                    <li>Violate any laws or regulations</li>
                    <li>Infringe on intellectual property rights</li>
                    <li>Transmit harmful or malicious code</li>
                    <li>Attempt to gain unauthorized access to our systems</li>
                    <li>Interfere with the proper functioning of the Service</li>
                    <li>Engage in fraudulent or deceptive practices</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Registration */}
          <Card>
            <CardHeader>
              <CardTitle>Account Registration</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">
                To access certain features of our Service, you may be required to create an account. 
                You are responsible for maintaining the confidentiality of your account information 
                and for all activities that occur under your account.
              </p>
              <p className="text-gray-700 leading-relaxed mt-4">
                You must be at least 18 years old to create an account and make purchases. If you 
                are under 18, you may use our Service only with the involvement of a parent or guardian.
              </p>
            </CardContent>
          </Card>

          {/* Products and Pricing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-green-600" />
                Products and Pricing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Product Information</h3>
                  <p className="text-gray-700">
                    We strive to provide accurate product descriptions, images, and pricing. However, 
                    we do not warrant that product descriptions or other content is accurate, complete, 
                    reliable, or error-free.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Pricing</h3>
                  <p className="text-gray-700">
                    All prices are displayed in South African Rand (ZAR) and are subject to change 
                    without notice. Prices do not include applicable taxes, shipping, or handling fees, 
                    which will be calculated at checkout.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Availability</h3>
                  <p className="text-gray-700">
                    Product availability is subject to change. We reserve the right to limit quantities 
                    and to discontinue products at any time without notice.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Orders and Payment */}
          <Card>
            <CardHeader>
              <CardTitle>Orders and Payment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Order Processing</h3>
                  <p className="text-gray-700">
                    All orders are subject to acceptance by us. We reserve the right to refuse or 
                    cancel any order for any reason, including but not limited to product availability, 
                    errors in pricing, or suspected fraudulent activity.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Terms</h3>
                  <p className="text-gray-700">
                    Payment is due at the time of order placement. We accept various payment methods 
                    as displayed at checkout. All payments are processed securely through our payment 
                    processors.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Order Confirmation</h3>
                  <p className="text-gray-700">
                    You will receive an order confirmation email upon successful order placement. 
                    This confirmation does not guarantee product availability or delivery.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping and Delivery */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-green-600" />
                Shipping and Delivery
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Shipping Methods</h3>
                  <p className="text-gray-700">
                    We offer various shipping options with different delivery times and costs. 
                    Shipping costs and estimated delivery times are calculated at checkout.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Delivery</h3>
                  <p className="text-gray-700">
                    Delivery times are estimates and may vary due to factors beyond our control. 
                    We are not responsible for delays caused by shipping carriers or other third parties.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Risk of Loss</h3>
                  <p className="text-gray-700">
                    Risk of loss and title for products purchased pass to you upon delivery to the 
                    carrier. We are not responsible for lost or damaged packages after delivery to the carrier.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Returns and Refunds */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-orange-600" />
                Returns and Refunds
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Return Policy</h3>
                  <p className="text-gray-700">
                    We offer a 30-day return policy for most items in their original condition. 
                    Some items may be excluded from returns due to hygiene or safety reasons.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Return Process</h3>
                  <p className="text-gray-700">
                    To initiate a return, contact our customer service team. Returns must be 
                    authorized before sending items back. Return shipping costs may apply.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Refunds</h3>
                  <p className="text-gray-700">
                    Refunds will be processed to the original payment method within 5-10 business 
                    days after we receive and inspect the returned items.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Warranties and Disclaimers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-purple-600" />
                Warranties and Disclaimers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Product Warranties</h3>
                  <p className="text-gray-700">
                    Products are covered by manufacturer warranties as specified in product documentation. 
                    We do not provide additional warranties beyond those provided by manufacturers.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Service Disclaimer</h3>
                  <p className="text-gray-700">
                    Our Service is provided "as is" without warranties of any kind, either express or 
                    implied. We disclaim all warranties, including but not limited to merchantability, 
                    fitness for a particular purpose, and non-infringement.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Limitation of Liability */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Limitation of Liability
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">
                To the maximum extent permitted by law, Best Brightness shall not be liable for any 
                indirect, incidental, special, consequential, or punitive damages, including but not 
                limited to loss of profits, data, or use, arising out of or relating to your use of 
                the Service.
              </p>
              <p className="text-gray-700 leading-relaxed mt-4">
                Our total liability to you for any claims arising out of or relating to these Terms 
                or the Service shall not exceed the amount you paid us for the products or services 
                giving rise to the claim.
              </p>
            </CardContent>
          </Card>

          {/* Intellectual Property */}
          <Card>
            <CardHeader>
              <CardTitle>Intellectual Property</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">
                The Service and its original content, features, and functionality are owned by Best 
                Brightness and are protected by international copyright, trademark, patent, trade 
                secret, and other intellectual property laws.
              </p>
              <p className="text-gray-700 leading-relaxed mt-4">
                You may not reproduce, distribute, modify, or create derivative works of our content 
                without our express written permission.
              </p>
            </CardContent>
          </Card>

          {/* Termination */}
          <Card>
            <CardHeader>
              <CardTitle>Termination</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">
                We may terminate or suspend your account and access to the Service immediately, 
                without prior notice, for any reason, including breach of these Terms.
              </p>
              <p className="text-gray-700 leading-relaxed mt-4">
                Upon termination, your right to use the Service will cease immediately. All 
                provisions of these Terms that by their nature should survive termination shall 
                survive termination.
              </p>
            </CardContent>
          </Card>

          {/* Governing Law */}
          <Card>
            <CardHeader>
              <CardTitle>Governing Law</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of 
                South Africa, without regard to conflict of law principles. Any disputes arising 
                from these Terms shall be subject to the exclusive jurisdiction of the courts 
                of South Africa.
              </p>
            </CardContent>
          </Card>

          {/* Changes to Terms */}
          <Card>
            <CardHeader>
              <CardTitle>Changes to Terms</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">
                We reserve the right to modify these Terms at any time. We will notify users of 
                any material changes by posting the new Terms on this page and updating the "Last 
                updated" date.
              </p>
              <p className="text-gray-700 leading-relaxed mt-4">
                Your continued use of the Service after any modifications constitutes acceptance 
                of the updated Terms.
              </p>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-green-600" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-4">
                If you have any questions about these Terms of Service, please contact us:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-semibold">Best Brightness (Pty) Ltd</p>
                <p>123 Business Street, Johannesburg, 2000</p>
                <p>Phone: +27 11 123 4567</p>
                <p>Email: legal@bestbrightness.co.za</p>
                <p>Website: www.bestbrightness.co.za</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
