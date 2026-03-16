import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import Dashboard from './pages/Dashboard';
import Conversation from './pages/Conversation';
import Translation from './pages/Translation';
import PresentationPage from './pages/Presentation';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="conversation" element={<Conversation />} />
          <Route path="translation"  element={<Translation />} />
          <Route path="presentation" element={<PresentationPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
