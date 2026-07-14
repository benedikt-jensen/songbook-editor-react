import React, {useCallback, useEffect, useRef} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {Previewer} from "pagedjs";
import ChordProPreview from "../../interfaces/ChordProPreview.tsx";
import pagedStyles from "../../style.css?raw";

interface PrintPreviewProps {
    text: string;
    currentPage: number;
    onPageCountChange: (pageCount: number) => void;
}

const PrintPreview: React.FC<PrintPreviewProps> = ({text, currentPage, onPageCountChange}) => {
    const textRef = useRef(text);
    const currentPageRef = useRef(currentPage);
    const onPageCountChangeRef = useRef(onPageCountChange);
    const pagedContainerRef = useRef<HTMLDivElement>(null);
    const activeBufferRef = useRef<HTMLDivElement | null>(null);
    const scaleContainerRef = useRef<HTMLDivElement>(null);
    const previewerRef = useRef<Previewer | null>(null);

    useEffect(() => {
        textRef.current = text;
    }, [text]);

    useEffect(() => {
        currentPageRef.current = currentPage;
    }, [currentPage]);

    useEffect(() => {
        onPageCountChangeRef.current = onPageCountChange;
    }, [onPageCountChange]);

    const rescale = useCallback(() => {
        const scaleContainer = scaleContainerRef.current;
        const buffer = activeBufferRef.current;
        const wrapper = scaleContainer?.parentElement;
        if (!scaleContainer || !buffer || !wrapper) return;
        const pages = Array.from(buffer.querySelectorAll<HTMLElement>('.pagedjs_page'));
        const page = pages.find(p => p.style.display !== 'none') ?? pages[0];
        if (!page) return;
        // offsetWidth/offsetHeight reflect the untransformed layout size, unlike
        // getBoundingClientRect() which includes the ancestor's scale transform
        // and would otherwise compound the scale on every subsequent call.
        const pageWidth = page.offsetWidth;
        const pageHeight = page.offsetHeight;
        if (pageWidth === 0 || pageHeight === 0) return;
        const wrapperRect = wrapper.getBoundingClientRect();
        const scale = Math.min(wrapperRect.width / pageWidth, wrapperRect.height / pageHeight);
        scaleContainer.style.width = `${pageWidth}px`;
        scaleContainer.style.height = `${pageHeight}px`;
        scaleContainer.style.transform = `scale(${scale})`;
    }, []);

    const showCurrentPage = useCallback(() => {
        const buffer = activeBufferRef.current;
        if (!buffer) return;
        const pages = Array.from(buffer.querySelectorAll<HTMLElement>('.pagedjs_page'));
        pages.forEach((page, i) => {
            page.style.display = i === currentPageRef.current ? '' : 'none';
        });
        rescale();
    }, [rescale]);

    const isPaginatingRef = useRef(false);
    const needsRerunRef = useRef(false);

    // Guards against overlapping preview() calls: if pagination is already running
    // when a newer edit comes in (preview() can easily take longer than the debounce
    // below on real content), we don't start a second Previewer until the in-flight
    // one finishes - we just flag it and re-run once done. Each run also paginates
    // into a brand new, offscreen buffer div rather than clearing/reusing the visible
    // one in place - the currently-shown pages are only replaced once a run fully
    // succeeds, so a run can never partially corrupt what's on screen.
    const runPagination = useCallback(async () => {
        if (isPaginatingRef.current) {
            needsRerunRef.current = true;
            return;
        }
        isPaginatingRef.current = true;
        try {
            do {
                needsRerunRef.current = false;
                const mountPoint = pagedContainerRef.current;
                if (!mountPoint) break;
                // Wait for webfonts to finish loading before paged.js measures layout -
                // otherwise pagination can be computed against fallback-font metrics,
                // then the page reflows once the real font swaps in, leaving content
                // positioned outside the page boundaries paged.js already committed to.
                await document.fonts.ready;
                const html = renderToStaticMarkup(<ChordProPreview text={textRef.current}/>);

                const buffer = document.createElement('div');
                buffer.style.position = 'absolute';
                buffer.style.top = '0';
                buffer.style.left = '0';
                buffer.style.visibility = 'hidden';
                buffer.style.pointerEvents = 'none';
                mountPoint.appendChild(buffer);

                const previewer = new Previewer();
                try {
                    const flow = await previewer.preview(html, [{'preview.css': pagedStyles}], buffer);

                    const oldBuffer = activeBufferRef.current;
                    const oldPreviewer = previewerRef.current;
                    buffer.style.position = '';
                    buffer.style.top = '';
                    buffer.style.left = '';
                    buffer.style.visibility = '';
                    buffer.style.pointerEvents = '';
                    activeBufferRef.current = buffer;
                    previewerRef.current = previewer;
                    oldBuffer?.remove();
                    oldPreviewer?.polisher?.styleEl?.remove();

                    onPageCountChangeRef.current(flow.total);
                    showCurrentPage();
                } catch (err) {
                    // eslint-disable-next-line no-console
                    console.error('paged.js pagination failed:', err);
                    buffer.remove();
                    previewer.polisher?.styleEl?.remove();
                }
            } while (needsRerunRef.current);
        } finally {
            isPaginatingRef.current = false;
        }
    }, [showCurrentPage]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            runPagination();
        }, 200);
        return () => clearTimeout(timeout);
    }, [text, runPagination]);

    useEffect(() => {
        showCurrentPage();
    }, [currentPage, showCurrentPage]);

    useEffect(() => {
        window.addEventListener('resize', rescale);
        return () => window.removeEventListener('resize', rescale);
    }, [rescale]);

    return (
        <div className="preview-container-wrapper flex-fill">
            <div className="paged-preview-scale-container" ref={scaleContainerRef}>
                <div ref={pagedContainerRef} style={{position: 'relative'}}></div>
            </div>
        </div>
    );
};

export default PrintPreview
