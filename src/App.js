import React from 'react';
import './App.css';

// Components
import FileUpload from './components/fileUpload';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <div className={'app-wrapper'}>
          <div>
            <FileUpload
                isReady={true}
            />
          </div>
          <div></div>
        </div>
      </header>
    </div>
  );
}

export default App;
