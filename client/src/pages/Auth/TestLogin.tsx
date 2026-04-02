import React from 'react';

const TestLogin: React.FC = () => {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Test Login Page</h1>
      <p>If you can see this, React is working!</p>
      <div>
        <input type="email" placeholder="Email" style={{ margin: '10px', padding: '10px' }} />
        <br />
        <input type="password" placeholder="Password" style={{ margin: '10px', padding: '10px' }} />
        <br />
        <button style={{ margin: '10px', padding: '10px 20px' }}>Login</button>
      </div>
    </div>
  );
};

export default TestLogin;
