import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import ReaderPage from "./pages/ReaderPage";
import './App.css';

function App() {
  return (
    <div className="App">
      <Router basename="/ebook-reader">
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/reader/:bookId" element={<ReaderPage />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
