import React from 'react';

import mockTransactionData from '../utils/transaction_mock.json'
import appStyles from './App.module.scss';

function App() {
  const { search } = window.location;
  const query = new URLSearchParams(search).get('txn_id');

  const data = mockTransactionData.data.find(
        ({id}) => id === query
      )

  let action; 
  let objectID;
    
  if (data) {
    if ("created" in data) {
      action = "Create"
      objectID = data?.created?.[0]
    } else if ("deleted" in data) {
      action = "Delete"
      objectID = data?.deleted?.[0]
    } else
    if ("mutated" in data) {
      action = "Mutate"
      objectID = data?.mutated?.[0]
    } else 
    {
      action = "Unknown"
      objectID = "Unknown"
    }
    } else {
      action = "No Data"
      objectID = "No Data"
    }

    return <div className={appStyles.app}>
      <h1>Mysten Labs</h1> 
      <h2>The Sui Explorer</h2> 
    <form action="/" method="get">
      <input
        type="text"
        id="search"
        placeholder="Search transactions by ID" 
        name="txn_id"/>
      <button type="submit">Search</button>
    </form>
    {(query) ? (
      <div>
        <br/>
        <div>Transaction ID</div> 
        <div>{data?.id}</div>
        <br/>
        <div>Status</div> 
        <div>{data?.status}</div> 
        <br/>
        <div>Sender</div> 
        <div>{data?.sender}</div>
        <br/>
        <div>Did</div> 
        <div>{action}</div>
        <br/>
        <div>Object</div> 
        <div>{objectID}</div>
      </div> 
    ) : (
      <div>No Latest Transactions</div>
    )
    }
    </div>;
}

export default App;
