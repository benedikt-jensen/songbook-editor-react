import classic from './print.css?raw';
import modern from './print-modern.css?raw';
import ug from './print-ug.css?raw';

export interface PrintStyle {
    id: string;
    label: string;
    css: string;
}

export const printStyles: PrintStyle[] = [
    { id: 'classic', label: 'Classic', css: classic },
    { id: 'modern', label: 'Modern', css: modern },
    { id: 'ug', label: 'Tab', css: ug },
];

export const defaultPrintStyleId = printStyles[0].id;
