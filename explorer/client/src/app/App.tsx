import React from 'react';

import LatestTransactions from '../components/latesttransactions/LatestTransactions'
import Search from '../components/search/Search';
import TransactionResult from '../components/transactionresult/TransactionResult'
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
      <div className={appStyles.search}>
        <h2>The Sui Explorer</h2> 
        <Search/>
      </div>
        {
          data 
          ? <TransactionResult data={data}/>
          : <LatestTransactions/>
        }
      <a href="/">Home</a>
    </div>;
}

export default App;
