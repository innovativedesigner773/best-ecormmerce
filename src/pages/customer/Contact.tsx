import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  MessageSquare, 
  Send, 
  CheckCircle, 
  Star,
  Users,
  Headphones,
  Globe,
  Heart,
  ArrowRight,
  Sparkles,
  Zap
} from 'lucide-react';
import { motion } from 'framer-motion';

const Contact: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    category: '',
    message: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      category: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsSubmitting(false);
    setIsSubmitted(true);
    
    // Reset form after 5 seconds
    setTimeout(() => {
      setIsSubmitted(false);
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        category: '',
        message: ''
      });
    }, 5000);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const stats = [
    { icon: Users, label: "Happy Customers", value: "10,000+" },
    { icon: Headphones, label: "Support Tickets", value: "24/7" },
    { icon: Star, label: "Customer Rating", value: "4.9/5" },
    { icon: Globe, label: "Countries Served", value: "50+" }
  ];

  const contactMethods = [
    {
      icon: MapPin,
      title: "Visit Our Store",
      description: "Come see our products in person",
      details: [
        "Best Brightness (Pty) Ltd",
        "123 Business Street",
        "Johannesburg, 2000",
        "South Africa"
      ],
      color: "from-green-500 to-emerald-500",
      bgColor: "bg-green-50",
      iconColor: "text-green-600"
    },
    {
      icon: Phone,
      title: "Call Us",
      description: "Speak directly with our team",
      details: [
        "Customer Service: +27 11 123 4567",
        "Sales Department: +27 11 123 4568",
        "Technical Support: +27 11 123 4569"
      ],
      color: "from-green-500 to-emerald-500",
      bgColor: "bg-green-50",
      iconColor: "text-green-600"
    },
    {
      icon: Mail,
      title: "Email Us",
      description: "Send us a detailed message",
      details: [
        "General: info@bestbrightness.co.za",
        "Support: support@bestbrightness.co.za",
        "Sales: sales@bestbrightness.co.za"
      ],
      color: "from-green-500 to-emerald-500",
      bgColor: "bg-green-50",
      iconColor: "text-green-600"
    },
    {
      icon: Clock,
      title: "Business Hours",
      description: "When we're available",
      details: [
        "Monday - Friday: 8:00 AM - 6:00 PM",
        "Saturday: 9:00 AM - 4:00 PM",
        "Sunday: Closed"
      ],
      color: "from-orange-500 to-red-500",
      bgColor: "bg-orange-50",
      iconColor: "text-orange-600"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-green-600/20 via-emerald-600/20 to-green-600/20 -z-10" />
        
        <div className="relative container mx-auto px-4 py-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-full text-sm font-medium mb-8 shadow-lg"
            >
              <Sparkles className="h-4 w-4" />
              Get in Touch with Our Team
            </motion.div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-black mb-6">
              Let's Connect
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 mb-12 leading-relaxed">
              We're here to help you succeed. Reach out to our amazing team for any questions, 
              support, or just to say hello! 🌟
            </p>

            {/* Stats */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16"
            >
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  className="text-center"
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
                    <stat.icon className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 pb-20">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
        >
          {/* Contact Methods */}
          <div className="lg:col-span-1 space-y-6">
            {contactMethods.map((method, index) => (
              <motion.div key={index} variants={itemVariants}>
                <Card className="group hover:shadow-2xl transition-all duration-500 border-0 bg-white/80 backdrop-blur-sm hover:bg-white">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-2xl bg-gradient-to-r ${method.color} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <method.icon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-semibold text-black group-hover:text-green-600 transition-colors">
                          {method.title}
                        </CardTitle>
                        <p className="text-sm text-gray-600">{method.description}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {method.details.map((detail, detailIndex) => (
                        <div key={detailIndex} className="flex items-center gap-2 text-sm text-gray-700">
                          <div className="w-1.5 h-1.5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex-shrink-0" />
                          {detail}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <motion.div variants={itemVariants}>
              <Card className="border-0 bg-white/90 backdrop-blur-sm shadow-2xl">
                <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 bg-white/20 rounded-xl">
                      <MessageSquare className="h-6 w-6" />
                    </div>
                    Send us a Message
                  </CardTitle>
                  <p className="text-green-100 mt-2">We'll get back to you within 24 hours!</p>
                </CardHeader>
                
                <CardContent className="p-8">
                  {isSubmitted ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-12"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                        className="w-20 h-20 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg"
                      >
                        <CheckCircle className="h-10 w-10 text-white" />
                      </motion.div>
                      <h3 className="text-2xl font-bold text-green-600 mb-3">Message Sent Successfully! 🎉</h3>
                      <p className="text-gray-600 mb-6">Thank you for contacting us. Our team will get back to you within 24 hours.</p>
                      <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                        <Heart className="h-4 w-4 text-red-500" />
                        We appreciate your patience
                      </div>
                    </motion.div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 }}
                        >
                          <Label htmlFor="name" className="text-sm font-medium text-gray-700 mb-2 block">
                            Full Name *
                          </Label>
                          <Input
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            required
                            placeholder="Enter your full name"
                            className="h-12 border-gray-300 focus:border-green-500 focus:ring-green-500 transition-colors"
                          />
                        </motion.div>
                        
                        <motion.div
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 }}
                        >
                          <Label htmlFor="email" className="text-sm font-medium text-gray-700 mb-2 block">
                            Email Address *
                          </Label>
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            required
                            placeholder="Enter your email"
                            className="h-12 border-gray-300 focus:border-green-500 focus:ring-green-500 transition-colors"
                          />
                        </motion.div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 }}
                        >
                          <Label htmlFor="phone" className="text-sm font-medium text-gray-700 mb-2 block">
                            Phone Number
                          </Label>
                          <Input
                            id="phone"
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            placeholder="Enter your phone number"
                            className="h-12 border-gray-300 focus:border-green-500 focus:ring-green-500 transition-colors"
                          />
                        </motion.div>
                        
                        <motion.div
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.4 }}
                        >
                          <Label htmlFor="category" className="text-sm font-medium text-gray-700 mb-2 block">
                            Inquiry Category *
                          </Label>
                          <Select value={formData.category} onValueChange={handleSelectChange}>
                            <SelectTrigger className="h-12 border-gray-300 focus:border-green-500 focus:ring-green-500">
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="general">General Inquiry</SelectItem>
                              <SelectItem value="product">Product Question</SelectItem>
                              <SelectItem value="order">Order Support</SelectItem>
                              <SelectItem value="technical">Technical Support</SelectItem>
                              <SelectItem value="billing">Billing Question</SelectItem>
                              <SelectItem value="return">Return/Exchange</SelectItem>
                              <SelectItem value="feedback">Feedback</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </motion.div>
                      </div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                      >
                        <Label htmlFor="subject" className="text-sm font-medium text-gray-700 mb-2 block">
                          Subject *
                        </Label>
                        <Input
                          id="subject"
                          name="subject"
                          value={formData.subject}
                          onChange={handleInputChange}
                          required
                          placeholder="Brief description of your inquiry"
                          className="h-12 border-gray-300 focus:border-green-500 focus:ring-green-500 transition-colors"
                        />
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                      >
                        <Label htmlFor="message" className="text-sm font-medium text-gray-700 mb-2 block">
                          Message *
                        </Label>
                        <Textarea
                          id="message"
                          name="message"
                          value={formData.message}
                          onChange={handleInputChange}
                          required
                          rows={6}
                          placeholder="Please provide details about your inquiry..."
                          className="border-gray-300 focus:border-green-500 focus:ring-green-500 transition-colors resize-none"
                        />
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                      >
                        <Button 
                          type="submit" 
                          className="w-full h-14 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <div className="flex items-center gap-3">
                              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                              Sending Message...
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <Send className="h-5 w-5" />
                              Send Message
                              <ArrowRight className="h-4 w-4" />
                            </div>
                          )}
                        </Button>
                      </motion.div>
                    </form>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* FAQ Section */}
            <motion.div variants={itemVariants} className="mt-8">
              <Card className="border-0 bg-white/90 backdrop-blur-sm shadow-xl">
                <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 bg-white/20 rounded-xl">
                      <Zap className="h-6 w-6" />
                    </div>
                    Quick Answers
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="group">
                        <h4 className="font-semibold text-gray-900 group-hover:text-green-600 transition-colors flex items-center gap-2">
                          <div className="w-2 h-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full" />
                          Response Time
                        </h4>
                        <p className="text-gray-600 text-sm mt-2">We typically respond to all inquiries within 24 hours during business days.</p>
                      </div>
                      
                      <div className="group">
                        <h4 className="font-semibold text-gray-900 group-hover:text-green-600 transition-colors flex items-center gap-2">
                          <div className="w-2 h-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full" />
                          Technical Support
                        </h4>
                        <p className="text-gray-600 text-sm mt-2">Yes, our technical support team is available Monday-Friday from 8 AM to 6 PM.</p>
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                      <div className="group">
                        <h4 className="font-semibold text-gray-900 group-hover:text-green-600 transition-colors flex items-center gap-2">
                          <div className="w-2 h-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full" />
                          Store Visits
                        </h4>
                        <p className="text-gray-600 text-sm mt-2">Absolutely! Our store is open Monday-Friday 8 AM-6 PM and Saturday 9 AM-4 PM.</p>
                      </div>
                      
                      <div className="group">
                        <h4 className="font-semibold text-gray-900 group-hover:text-green-600 transition-colors flex items-center gap-2">
                          <div className="w-2 h-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full" />
                          Emergency Support
                        </h4>
                        <p className="text-gray-600 text-sm mt-2">For urgent matters, please call our emergency line at +27 11 123 4569.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Contact;