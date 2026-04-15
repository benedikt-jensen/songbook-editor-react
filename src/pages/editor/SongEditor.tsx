import React, { useState, useEffect, useRef } from "react";
import { EditorView } from "@codemirror/view";
import { EditorState, type Extension } from "@codemirror/state";
import { basicSetup } from "codemirror";
import '../../App.css'
import { downloadPdfFromHtml } from '../../api/pdf.tsx';
import cssContent from '../../style.css?raw';
import sampleText from '../../songs/CountryRoads.txt?raw';
import bootstrapCss from 'bootstrap/dist/css/bootstrap.min.css?raw';
import {BASE_URL} from "../../config.ts";


const SongEditor: React.FC = () => {
    const previewIframeRef = useRef<HTMLIFrameElement>(null);
    
    const sendDataToPreviewIframe = (msg: any) => {
        previewIframeRef.current?.contentWindow?.postMessage(msg, '*');
    };
    
    const updateSongText = (text: string) => {
        sendDataToPreviewIframe({songSource: text});
    }
    
    const [text, setText] = useState<string>("");
    
    useEffect(() => {
        document.body.onload = () => setText(sampleText);
    });
    
    const downloadPreviewAsPdf = () => {
        const previewDoc = previewIframeRef.current?.contentDocument!;
        const page = previewDoc.getElementById('page-preview')?.innerHTML || '';
        const title = previewDoc.getElementById('song-title')?.innerHTML || 'unnamed';
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
            <body onload="setPreviewContainerFontSize()" onresize="setPreviewContainerFontSize()" style="width:800px;">
                <script defer>
                    function setPreviewContainerFontSize() {
                        console.log("Window loaded:", window.innerWidth, window.innerHeight);
                        Array.from(document.getElementsByClassName("preview-container")).forEach((el) => {
                            el.style.fontSize = el.getBoundingClientRect().height * 0.02 + "px";
                        });
                    }
                </script>
                <div style="display: flex; flex-direction: column; width: 100%">
                    ${page}
                </div>
            </body>
            </html>
        `;
        // downloadAsHtml(html);
        downloadPdfFromHtml(html, `${title}.pdf`);
    };

    // const downloadAsHtml = (html: string) => {
    //     let element = document.createElement('a');
    //     element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(html));
    //     element.setAttribute('download', 'preview.html');
    //
    //     element.style.display = 'none';
    //     document.body.appendChild(element);
    //
    //     element.click();
    //
    //     document.body.removeChild(element);
    // }

    const editorRef = useRef<HTMLDivElement | null>(null);
    const viewRef = useRef<EditorView | null>(null);
    
    useEffect(() => {
        if (!editorRef.current) return;


        const updateListener: Extension = EditorView.updateListener.of((update) => {
            if (update.docChanged) {
                const value = update.state.doc.toString();
                updateSongText(value);
                setText(value);
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

    const setPreviewContainerFontSize = () => {
        console.log("Window loaded:", window.innerWidth, window.innerHeight);
        Array.from(document.getElementsByClassName("preview-container")).forEach((el) => {
            (el as HTMLElement).style.fontSize = el.getBoundingClientRect().height * 0.02 + "px";
        });
    };

    useEffect(() => {
        window.addEventListener("load", setPreviewContainerFontSize);
        window.addEventListener("resize", setPreviewContainerFontSize);

        // run immediately if page already loaded
        if (document.readyState === "complete") {
            setPreviewContainerFontSize();
        }

        return () => {
            window.removeEventListener("load", setPreviewContainerFontSize);
            window.removeEventListener("resize", setPreviewContainerFontSize);
        };
    }, []);
    
    return (
        <div style={{ display: "flex", flexDirection: "row", height: "100%", width: "100vw", padding: "1vh", boxSizing: "border-box", }}>

            <div style={{ display: 'flex', flex: '1 1 0', flexDirection: 'column', marginRight: "10px", minWidth: 0, minHeight: 0, }}>
                <h3>Editor</h3>
                <div className="scrollable border-gray" style={{ flex: "1 1 0", marginRight: "10px", }}>
                    <div ref={editorRef}></div>
                </div>
                <button className="btn btn-primary mt-2 me-2" onClick={downloadPreviewAsPdf}>Print to PDF</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', marginRight: "10px", width: "65vh", }}>
                <h3>Preview</h3>
                <div className="border-gray flex-fill">
                    <iframe onLoad={() => updateSongText(text)} ref={previewIframeRef} src={`${BASE_URL}page-preview`} style={{width: '100%', height: '100%'}}></iframe>
                </div>
            </div>

        </div>
    );
};

export default SongEditor