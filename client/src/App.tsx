import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Home, LearnMore, About } from './pages';
import { Dashboard } from './Dashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/learn-more" element={<LearnMore />} />
        <Route path="/about" element={<About />} />
        <Route path="/squad" element={<Dashboard initialPage="squad" />} />
        <Route path="/transfers" element={<Dashboard initialPage="transfers" />} />
        <Route path="/fixtures" element={<Dashboard initialPage="fixtures" />} />
        <Route path="/live" element={<Dashboard initialPage="live" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
