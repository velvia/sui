import { useState } from 'react';

import appStyles from './App.module.scss';

function App() {
  const [data, setData] = useState("")

  fetch('http://localhost:4000')
    .then(response => response.json())
    .then(json => {
            setData(JSON.stringify(json))
            console.log(json)
    })
    .catch(error => setData(error))

  if (data) {
    return (<div className={appStyles.app}>{data}</div>)
  } else {
    return (<div>Loading...</div>)
  }
}

export default App;
