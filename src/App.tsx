import { Routes, Route } from "react-router-dom";
import CollectionsPage from "./pages/CollectionsPage.tsx";
import CollectionDetailPage from "./pages/CollectionDetailPage.tsx";

import "./App.css";

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<CollectionsPage/>} />
      <Route path="collection/:id" element={<CollectionDetailPage />} />
    </Routes>
  )
};

export default App;