// App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from './app/store';
import Hero from './components/Hero';
import Header from './components/Header';
import Home from './components/Home';

function App() {
  return (
    <Provider store={store}>
      <Router>
      <Header />
        <Routes>
          <Route exact path="/" element={<Hero />} />
          <Route exact path="/channels" element={<Home />} />
          <Route exact path="/channels/:id" element={<Home />} />
        </Routes>
      </Router>
    </Provider>
  );
}

export default App;
