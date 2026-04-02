import React from 'react';

const TestApp: React.FC = () => {
  return (
    <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <h1 style={{ color: '#1976d2', marginBottom: '20px' }}>
        Stock Portfolio Analyzer - Test Mode
      </h1>
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', maxWidth: '400px', margin: '0 auto' }}>
        <h2>Login Test</h2>
        <p>If you can see this page, React is working correctly!</p>
        <div style={{ marginBottom: '10px' }}>
          <input 
            type="email" 
            placeholder="Email" 
            style={{ 
              width: '100%', 
              padding: '10px', 
              border: '1px solid #ddd', 
              borderRadius: '4px',
              marginBottom: '10px'
            }} 
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <input 
            type="password" 
            placeholder="Password" 
            style={{ 
              width: '100%', 
              padding: '10px', 
              border: '1px solid #ddd', 
              borderRadius: '4px',
              marginBottom: '10px'
            }} 
          />
        </div>
        <button 
          style={{ 
            width: '100%', 
            padding: '10px', 
            backgroundColor: '#1976d2', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Login
        </button>
        <p style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
          Test Mode - Full features available after fixing the main app
        </p>
      </div>
    </div>
  );
};

export default TestApp;
