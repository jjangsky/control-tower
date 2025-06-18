import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MainDashboard } from './pages/MainDashboard';
import { ServerDetail } from './pages/ServerDetail';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/" element={<MainDashboard />} />
          <Route path="/server/:hostname" element={<ServerDetail />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
