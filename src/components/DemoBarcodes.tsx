import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Copy, Package } from 'lucide-react';
import { toast } from 'sonner';

interface DemoBarcode {
  barcode: string;
  product: string;
  brand?: string;
  description: string;
}

const demoBarcodes: DemoBarcode[] = [
  {
    barcode: '7622210517821',
    product: 'Toblerone Swiss Milk Chocolate',
    brand: 'Toblerone',
    description: 'Classic Swiss chocolate with honey and almond nougat'
  },
  {
    barcode: '4902430735408',
    product: 'Kit Kat Wafer Bar',
    brand: 'Nestle',
    description: 'Crispy wafer fingers covered in milk chocolate'
  },
  {
    barcode: '0012000161155',
    product: 'Coca-Cola Classic',
    brand: 'Coca-Cola',
    description: 'Classic cola soft drink'
  },
  {
    barcode: '3017620425035',
    product: 'Nutella Hazelnut Spread',
    brand: 'Ferrero',
    description: 'Creamy hazelnut spread with cocoa'
  },
  {
    barcode: '8710398720344',
    product: 'Dove Beauty Bar',
    brand: 'Dove',
    description: 'Moisturizing beauty bar with 1/4 moisturizing cream'
  }
];

interface DemoBarcodesProps {
  onBarcodeSelect: (barcode: string) => void;
}

export function DemoBarcodes({ onBarcodeSelect }: DemoBarcodesProps) {
  const copyToClipboard = (barcode: string) => {
    navigator.clipboard.writeText(barcode);
    toast.success('Barcode copied to clipboard!');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Demo Barcodes
        </CardTitle>
        <CardDescription>
          Use these example barcodes to test the barcode lookup system
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {demoBarcodes.map((item) => (
          <div key={item.barcode} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <div className="font-medium text-sm">{item.product}</div>
              {item.brand && (
                <div className="text-xs text-gray-600">{item.brand}</div>
              )}
              <div className="text-xs text-gray-500 mt-1">{item.description}</div>
              <div className="text-xs font-mono text-gray-700 mt-1">{item.barcode}</div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(item.barcode)}
                title="Copy barcode"
              >
                <Copy className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                onClick={() => onBarcodeSelect(item.barcode)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Use
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}