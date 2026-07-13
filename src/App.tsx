import { HashRouter, Routes, Route } from 'react-router-dom';
import SongEditor from './pages/editor/SongEditor';
import PrintPreview from './pages/preview/PrintPreview';

function App() {
    return (
        <HashRouter>
            <Routes>
                <Route path="" element={<SongEditor />} />
                <Route path="page-preview" element={<PrintPreview />} />
            </Routes>
        </HashRouter>
    );
}

export default App;