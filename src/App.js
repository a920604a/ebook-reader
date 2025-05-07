import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import ReaderPage from "./pages/ReaderPage";
import './App.css';

function App() {
  return (
    <Router basename="/ebook-reader">
      <div className="App">
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/reader/:bookId" element={<ReaderPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
