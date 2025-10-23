import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { BrowserMultiFormatReader } from '@zxing/browser';

interface SimpleBarcodeScannerProps {
  onBarcodeScanned: (barcode: string) => void;
  onClose: () => void;
}

export function SimpleBarcodeScanner({ onBarcodeScanned, onClose }: SimpleBarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const startScanning = useCallback(async () => {
    if (!videoRef.current || isScanning) return;

    try {
      setIsScanning(true);
      setScanCount(0);
      setError(null);
      
      // Create optimized code reader with error handling
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
              now - lastScanRef.current.at > 300
            ) {
              lastScanRef.current = { code: text, at: now };
              setScanCount(prev => prev + 1);
              setLastScanTime(now);
              
              // Clear any existing timeout
              if (scanTimeoutRef.current) {
                clearTimeout(scanTimeoutRef.current);
              }
              
              // Process the barcode with a small delay
              scanTimeoutRef.current = setTimeout(() => {
                handleBarcodeScanned(text);
              }, 100);
            }
          }
          
          if (error && !error.message?.includes('No MultiFormat Readers')) {
            console.warn('Scanning error:', error);
          }
        }
      ).catch((err) => {
        console.error('Scanner decode error:', err);
        setError('Failed to start scanning. Please try again.');
        setIsScanning(false);
      });
    } catch (error) {
      console.error('Scanner initialization error:', error);
      setError('Failed to initialize scanner. Please try again.');
      setIsScanning(false);
    }
  }, [isScanning]);

  const handleBarcodeScanned = (barcode: string) => {
    if (!barcode.trim()) return;
    
    // Stop scanning safely
    stopScanning();
    
    // Return the barcode to parent
    onBarcodeScanned(barcode);
    onClose();
  };

  const stopScanning = () => {
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

  // Initialize camera and start scanning
  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(cameraConstraints);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Start scanning after a short delay
          setTimeout(() => {
            startScanning();
          }, 500);
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setError('Unable to access camera. Please check permissions.');
      }
    };

    initCamera();

    return () => {
      stopScanning();
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50">
      {/* Glass overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-lg bg-white/95 backdrop-blur-sm border border-black/5 shadow-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Scan Barcode
                </CardTitle>
                <CardDescription>
                  Position the barcode within the camera view
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Camera View */}
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
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm">Scanning... ({scanCount} attempts)</span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Status Info */}
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Point camera at barcode</span>
              {scanCount > 0 && (
                <span className="text-blue-600 font-medium">
                  {scanCount} scan{scanCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            
            {lastScanTime > 0 && (
              <div className="text-xs text-gray-500 text-center">
                Last scan: {new Date(lastScanTime).toLocaleTimeString()}
              </div>
            )}

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Instructions */}
            <div className="text-xs text-gray-500 space-y-1">
              <p>• Ensure good lighting</p>
              <p>• Hold steady and focus on the barcode</p>
              <p>• The scanner will automatically detect the barcode</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
