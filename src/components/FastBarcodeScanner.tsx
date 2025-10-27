import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Type, X, CheckCircle, AlertCircle, TestTube, Zap, Target } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { DemoBarcodes } from './DemoBarcodes';
import { BrowserMultiFormatReader } from '@zxing/browser';

interface Product {
  name: string;
  brand: string;
  category: string;
  description: string;
  barcode: string;
  price: number;
  image_url: string;
  sku: string;
  weight?: string;
  dimensions?: string;
  ingredients?: string;
  features?: string[];
}

interface FastBarcodeScannerProps {
  onProductScanned: (product: Product) => void;
  onClose: () => void;
}

export function FastBarcodeScanner({ onProductScanned, onClose }: FastBarcodeScannerProps) {
  const [scanMode, setScanMode] = useState<'camera' | 'manual' | 'demo'>('demo');
  const [manualBarcode, setManualBarcode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const [lastScanTime, setLastScanTime] = useState<number>(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const lastScanRef = useRef<{ code: string; at: number } | null>(null);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Optimized camera settings for faster scanning
  const cameraConstraints = {
    video: {
      facingMode: 'environment',
      width: { ideal: 1280, min: 640 },
      height: { ideal: 720, min: 480 },
      frameRate: { ideal: 30, min: 15 }
    }
  };

  // Start camera when switching to camera mode
  useEffect(() => {
    if (scanMode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    
    return () => stopCamera();
  }, [scanMode]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(cameraConstraints);
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Start scanning after a short delay to ensure video is ready
        setTimeout(() => {
          startFastScanning();
        }, 500);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setError('Unable to access camera. Please use manual entry.');
      setScanMode('manual');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    if (codeReaderRef.current) {
      try {
        // Check if reset method exists before calling it
        if (typeof codeReaderRef.current.reset === 'function') {
          codeReaderRef.current.reset();
        }
      } catch (error) {
        console.warn('Error resetting scanner:', error);
      }
      codeReaderRef.current = null;
    }
    setIsScanning(false);
  };

  const startFastScanning = useCallback(async () => {
    if (!videoRef.current || isScanning) return;

    try {
      setIsScanning(true);
      setScanCount(0);
      
      // Create optimized code reader with faster settings
      const codeReader = new BrowserMultiFormatReader();
      codeReaderRef.current = codeReader;

      // Start continuous scanning (BrowserMultiFormatReader handles format detection automatically)
      await codeReader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result, error) => {
          if (result) {
            const text = result.getText();
            const now = Date.now();
            
            // Enhanced debouncing for faster response
            if (
              !lastScanRef.current ||
              lastScanRef.current.code !== text ||
              now - lastScanRef.current.at > 300 // Reduced from 800ms to 300ms
            ) {
              lastScanRef.current = { code: text, at: now };
              setScanCount(prev => prev + 1);
              setLastScanTime(now);
              
              // Clear any existing timeout
              if (scanTimeoutRef.current) {
                clearTimeout(scanTimeoutRef.current);
              }
              
              // Process the barcode with a small delay to allow for multiple scans
              scanTimeoutRef.current = setTimeout(() => {
                handleBarcodeScanned(text);
              }, 100);
            }
          }
          
          if (error && !error.message?.includes('No MultiFormat Readers')) {
            console.warn('Scanning error:', error);
          }
        }
      );
    } catch (error) {
      console.error('Scanner initialization error:', error);
      setError('Failed to initialize scanner. Please try manual entry.');
      setIsScanning(false);
    }
  }, [isScanning]);

  const handleBarcodeScanned = async (barcode: string) => {
    if (!barcode.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Import the project info for API calls
      const { projectId, publicAnonKey } = await import('../utils/supabase/info');
      
      // First check if product already exists
      const checkResponse = await fetch(`${window.location.origin}/make-server-8880f2f2/barcode/check/${barcode}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });
      
      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        
        if (checkData.exists) {
          setError(`Product already exists: ${checkData.product.name}`);
          setIsLoading(false);
          return;
        }
      }

      // Lookup product from API
      const response = await fetch(`${window.location.origin}/make-server-8880f2f2/barcode/lookup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ barcode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to lookup barcode');
      }

      setScannedProduct(data.product);
    } catch (error) {
      console.error('Barcode lookup error:', error);
      setError(error instanceof Error ? error.message : 'Failed to lookup barcode');
    } finally {
      setIsLoading(false);
    }
  };

  const lookupBarcode = async (barcode: string) => {
    await handleBarcodeScanned(barcode);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualBarcode.trim()) {
      lookupBarcode(manualBarcode.trim());
    }
  };

  const handleAddProduct = () => {
    if (scannedProduct) {
      onProductScanned(scannedProduct);
      setScannedProduct(null);
      setManualBarcode('');
      onClose();
    }
  };

  const handleTryAnother = () => {
    setScannedProduct(null);
    setError(null);
    setManualBarcode('');
    setScanCount(0);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50">
      {/* Glass overlay (stronger scrim) */}
      <div className="absolute inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm" />
      <div className="relative flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border border-black/5 dark:border-white/10 shadow-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Fast Barcode Scanner
                </CardTitle>
                <CardDescription>
                  High-speed barcode scanning with optimized performance
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {!scannedProduct && (
              <>
                {/* Scan Mode Toggle */}
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={scanMode === 'demo' ? 'default' : 'outline'}
                    onClick={() => setScanMode('demo')}
                    size="sm"
                  >
                    <TestTube className="h-4 w-4 mr-1" />
                    Demo
                  </Button>
                  <Button
                    variant={scanMode === 'manual' ? 'default' : 'outline'}
                    onClick={() => setScanMode('manual')}
                    size="sm"
                  >
                    <Type className="h-4 w-4 mr-1" />
                    Manual
                  </Button>
                  <Button
                    variant={scanMode === 'camera' ? 'default' : 'outline'}
                    onClick={() => setScanMode('camera')}
                    size="sm"
                  >
                    <Camera className="h-4 w-4 mr-1" />
                    Camera
                  </Button>
                </div>

                {/* Demo Mode */}
                {scanMode === 'demo' && (
                  <DemoBarcodes onBarcodeSelect={(barcode) => {
                    setManualBarcode(barcode);
                    lookupBarcode(barcode);
                  }} />
                )}

                {/* Camera Mode with Enhanced UI */}
                {scanMode === 'camera' && (
                  <div className="space-y-4">
                    <div className="relative">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-64 bg-gray-100 rounded-lg"
                      />
                      {isScanning && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-black/50 rounded-lg p-4 flex items-center gap-2 text-white">
                            <Target className="h-4 w-4 animate-pulse" />
                            <span className="text-sm">Scanning... ({scanCount} attempts)</span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>Position barcode within the camera view</span>
                      {scanCount > 0 && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          {scanCount} scans
                        </Badge>
                      )}
                    </div>
                    
                    {lastScanTime > 0 && (
                      <div className="text-xs text-gray-500 text-center">
                        Last scan: {new Date(lastScanTime).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                )}

                {/* Manual Entry */}
                {(scanMode === 'manual' || scanMode === 'demo') && (
                  <form onSubmit={handleManualSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Enter Barcode Manually
                      </label>
                      <Input
                        type="text"
                        placeholder="Enter barcode number..."
                        value={manualBarcode}
                        onChange={(e) => setManualBarcode(e.target.value)}
                        disabled={isLoading}
                        autoFocus
                      />
                    </div>
                    <Button 
                      type="submit" 
                      disabled={!manualBarcode.trim() || isLoading}
                      className="w-full"
                    >
                      {isLoading ? 'Looking up...' : 'Lookup Product'}
                    </Button>
                  </form>
                )}
              </>
            )}

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Product Preview */}
            {scannedProduct && (
              <div className="space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Product found! Review the details below and confirm to add to inventory.
                  </AlertDescription>
                </Alert>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {scannedProduct.image_url && (
                        <img
                          src={scannedProduct.image_url}
                          alt={scannedProduct.name}
                          className="w-24 h-24 object-cover rounded-lg bg-gray-100"
                        />
                      )}
                      <div className="flex-1 space-y-2">
                        <h3 className="font-semibold text-lg">{scannedProduct.name}</h3>
                        {scannedProduct.brand && (
                          <Badge variant="secondary">{scannedProduct.brand}</Badge>
                        )}
                        <p className="text-sm text-gray-600">{scannedProduct.description}</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="font-medium">Barcode:</span> {scannedProduct.barcode}
                          </div>
                          <div>
                            <span className="font-medium">Category:</span> {scannedProduct.category}
                          </div>
                          <div>
                            <span className="font-medium">Price:</span> R{scannedProduct.price}
                          </div>
                          <div>
                            <span className="font-medium">SKU:</span> {scannedProduct.sku}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-2">
                  <Button onClick={handleTryAnother} variant="outline" className="flex-1">
                    Try Another
                  </Button>
                  <Button onClick={handleAddProduct} className="flex-1">
                    Add Product
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
