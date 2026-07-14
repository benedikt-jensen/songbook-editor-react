import React, { useState, useEffect, useRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { EditorView } from "@codemirror/view";
import { EditorState, type Extension } from "@codemirror/state";
import { basicSetup } from "codemirror";
import '../../App.css'
import { downloadPdfFromHtml } from '../../api/pdf.tsx';
import ChordProPreview from "../../interfaces/ChordProPreview.tsx";
import PrintPreview from "../preview/PrintPreview.tsx";
import cssContent from '../../style.css?raw';
import sampleText from '../../songs/CountryRoads.txt?raw';
import bootstrapCss from 'bootstrap/dist/css/bootstrap.min.css?raw';

function extractTitle(text: string): string {
    for (const line of text.split(/\r?\n/)) {
        const match = line.trim().match(/^\{title:\s*(.+?)\s*\}$/i);
        if (match) return match[1];
    }
    return 'unnamed';
}

const SongEditor: React.FC = () => {
    const [text, setText] = useState<string>(sampleText);
    const [pageCount, setPageCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(0);

    const downloadPreviewAsPdf = () => {
        const page = renderToStaticMarkup(<ChordProPreview text={text}/>);
        const title = extractTitle(text);
        const html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8">
              <title>Dynamic PDF</title>
              <style>
                ${bootstrapCss}
                ${cssContent}
              </style>
              <link href="https://fonts.googleapis.com/css?family=Roboto" rel="stylesheet">
            </head>
            <body>
                ${page}
            </body>
            </html>
        `;
        downloadPdfFromHtml(html, `${title}.pdf`);
    };

    const editorRef = useRef<HTMLDivElement | null>(null);
    const viewRef = useRef<EditorView | null>(null);

    useEffect(() => {
        if (!editorRef.current) return;


        const updateListener: Extension = EditorView.updateListener.of((update) => {
            if (update.docChanged) {
                const value = update.state.doc.toString();
                setText(value);
                setCurrentPage(0);
            }
        });

        const startState = EditorState.create({
            doc: text,
            extensions: [basicSetup, updateListener],
        });

        viewRef.current = new EditorView({
            state: startState,
            parent: editorRef.current,
        });

        return () => {
            if (viewRef.current) {
                viewRef.current.destroy();
                viewRef.current = null;
            }
        };
    }, []); // run once on mount

    useEffect(() => {
        if (viewRef.current) {
            const currentText = viewRef.current.state.doc.toString();
            if (currentText !== text) {
                viewRef.current.dispatch({
                    changes: { from: 0, to: currentText.length, insert: text },
                });
            }
        }
    }, [text]);

    return (
        <div style={{ display: "flex", flexDirection: "row", height: "100%", width: "100vw", padding: "1vh", boxSizing: "border-box", }}>

            <div style={{ display: 'flex', flex: '1 1 0', flexDirection: 'column', marginRight: "10px", minWidth: 0, minHeight: 0, }}>
                <h3>Editor</h3>
                <div className="scrollable border-gray" style={{ flex: "1 1 0", marginRight: "10px", }}>
                    <div ref={editorRef}></div>
                </div>
                <button className="btn btn-primary mt-2 me-2" onClick={downloadPreviewAsPdf}>Print to PDF</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', marginRight: "10px", width: "65vh", minHeight: 0, }}>
                <h3>Preview</h3>
                <div className="border-gray preview-hover-container flex-fill d-flex flex-column" style={{ minHeight: 0, minWidth: 0, overflow: 'hidden' }}>
                    <PrintPreview text={text} currentPage={currentPage} onPageCountChange={setPageCount} />
                    <div className="preview-nav-overlay d-flex align-items-center justify-content-center gap-2 py-1 px-3">
                        <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                            disabled={currentPage === 0}
                        >&laquo; Prev</button>
                        <span>Page {currentPage + 1} of {Math.max(pageCount, 1)}</span>
                        <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => setCurrentPage(p => Math.min(pageCount - 1, p + 1))}
                            disabled={currentPage === pageCount - 1 || pageCount === 0}
                        >Next &raquo;</button>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default SongEditor
