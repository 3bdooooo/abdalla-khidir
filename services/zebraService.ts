
import { useEffect, useState } from 'react';

// The RFD8500 in HID mode "types" the EPC code very fast, followed by an Enter key.
// We listen for this pattern to capture RFID tags without requiring focus on an input field.

interface ZebraScannerProps {
    onScan: (tagId: string) => void;
    isActive: boolean;
}

export const useZebraScanner = ({ onScan, isActive }: ZebraScannerProps) => {
    const [status, setStatus] = useState<'disconnected' | 'listening' | 'processing'>('disconnected');
    const [lastScanned, setLastScanned] = useState<string>('');

    useEffect(() => {
        if (!isActive) {
            setStatus('disconnected');
            return;
        }

        setStatus('listening');

        let buffer = '';
        let lastKeyTime = Date.now();

        const handleKeyDown = (e: KeyboardEvent) => {
            const currentTime = Date.now();
            const timeDiff = currentTime - lastKeyTime;
            
            // Zebra scanners type extremely fast (<30ms between keys usually)
            // Manual typing is usually >50ms.
            
            // We verify 'Enter' to commit the scan.
            if (e.key === 'Enter') {
                if (buffer.length > 3) { // Minimum length for a valid tag to avoid noise
                    const scannedTag = buffer.trim();
                    setLastScanned(scannedTag);
                    setStatus('processing');
                    
                    // Trigger callback
                    onScan(scannedTag);
                    
                    // Reset status after a brief visual flash
                    setTimeout(() => setStatus('listening'), 500);
                }
                buffer = '';
            } else if (e.key.length === 1) { // Ignore special keys like Shift/Ctrl
                // If gap is too long, assume it's a new scan or manual typing starting, reset buffer
                if (timeDiff > 100) {
                    buffer = '';
                }
                buffer += e.key;
            }
            
            lastKeyTime = currentTime;
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isActive, onScan]);

    return { status, lastScanned };
};
