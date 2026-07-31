import type { Component } from 'vue';
import classicCss from './classic/style.css?raw';
import ClassicTemplate from './classic/ChordProDocument.vue';
import modernCss from './modern/style.css?raw';
import ModernTemplate from './modern/ChordProDocument.vue';
import ugCss from './ug/style.css?raw';
import UgTemplate from './ug/ChordProDocument.vue';

export interface PrintStyle {
    id: string;
    label: string;
    css: string;
    /** Renders the song for this style - each style owns its full markup, not just its CSS. */
    template: Component;
}

export const printStyles: PrintStyle[] = [
    { id: 'classic', label: 'Classic', css: classicCss, template: ClassicTemplate },
    { id: 'modern', label: 'Modern', css: modernCss, template: ModernTemplate },
    { id: 'ug', label: 'Tab', css: ugCss, template: UgTemplate },
];

export const defaultPrintStyleId = printStyles[0].id;
