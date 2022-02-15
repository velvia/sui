import React from 'react';

import LatestTransactions from '../components/LatestTransactions'
import Search from '../components/Search';
import TransactionResult from '../components/TransactionResult'
import mockTransactionData from '../utils/transaction_mock.json'
import appStyles from './App.module.scss';

function App() {
  const { search } = window.location;
  const query = new URLSearchParams(search).get('txn_id');

  const data = mockTransactionData.data.find(
        ({id}) => id === query
      )
  
    return <div className={appStyles.app}>
      <h1>Mysten Labs</h1> 
      <h2>The Sui Explorer</h2> 
      <Search/>
        {data 
          ? <TransactionResult data={data}/>
          : <LatestTransactions/>
    }
    </div>;
}

export default App;
