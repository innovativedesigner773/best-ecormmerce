import React, { useState } from 'react';
import { Scan, Type, Camera, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { SimpleBarcodeScanner } from './SimpleBarcodeScanner';

interface BarcodeInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function BarcodeInput({ value, onChange, placeholder = "Product barcode", disabled = false, className = "" }: BarcodeInputProps) {
  const [inputMode, setInputMode] = useState<'type' | 'scan'>('type');
  const [showScanner, setShowScanner] = useState(false);
  const [scanningStatus, setScanningStatus] = useState<'idle' | 'scanning' | 'success'>('idle');

  const handleBarcodeScanned = (barcode: string) => {
    onChange(barcode);
    setScanningStatus('success');
    setShowScanner(false);
    
    // Reset status after a short delay
    setTimeout(() => {
      setScanningStatus('idle');
    }, 2000);
  };

  const handleScanClick = () => {
    setShowScanner(true);
    setScanningStatus('scanning');
  };

  const handleManualInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <>
      <div className={`space-y-2 ${className}`}>
        {/* Input Mode Toggle */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
          <Button
            type="button"
            variant={inputMode === 'type' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setInputMode('type')}
            className="flex-1"
            disabled={disabled}
          >
            <Type className="h-4 w-4 mr-1" />
            Type
          </Button>
          <Button
            type="button"
            variant={inputMode === 'scan' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setInputMode('scan')}
            className="flex-1"
            disabled={disabled}
          >
            <Scan className="h-4 w-4 mr-1" />
            Scan
          </Button>
        </div>

        {/* Input Field */}
        <div className="relative">
          <Input
            type="text"
            value={value}
            onChange={handleManualInput}
            placeholder={placeholder}
            disabled={disabled}
            className="pr-10"
          />
          
          {/* Scan Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleScanClick}
            disabled={disabled}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-blue-50 hover:border-blue-300"
            title="Scan barcode with camera"
          >
            <Camera className="h-4 w-4" />
          </Button>
        </div>

        {/* Status Indicators */}
        {scanningStatus === 'scanning' && (
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
            <span>Ready to scan...</span>
          </div>
        )}
        
        {scanningStatus === 'success' && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <div className="w-2 h-2 bg-green-600 rounded-full"></div>
            <span>Barcode scanned successfully!</span>
          </div>
        )}

        {/* Quick Actions */}
        {value && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {value.length} characters
            </Badge>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange('')}
              className="h-6 w-6 p-0"
              title="Clear barcode"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Help Text */}
        <div className="text-xs text-gray-500">
          {inputMode === 'type' 
            ? "Type the barcode manually or click the camera icon to scan"
            : "Click the camera icon to scan a barcode with your device camera"
          }
        </div>
      </div>

      {/* Barcode Scanner Modal */}
      {showScanner && (
        <SimpleBarcodeScanner
          onBarcodeScanned={(barcode) => {
            handleBarcodeScanned(barcode);
          }}
          onClose={() => {
            setShowScanner(false);
            setScanningStatus('idle');
          }}
        />
      )}
    </>
  );
}
