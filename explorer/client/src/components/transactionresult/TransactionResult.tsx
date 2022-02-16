type DataType = {
  id: string;
  status: string;
  sender: string;
  created?: string[];
  deleted?: string[];
  mutated?: string[];
}

function TransactionResult({data} : {data : DataType}) {
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

return <div>
        <br/>
        <div>Transaction ID</div> 
        <div>{data.id}</div>
        <br/>
        <div>Status</div> 
        <div>{data.status}</div> 
        <br/>
        <div>Sender</div> 
        <div>{data.sender}</div>
        <br/>
        <div>Did</div> 
        <div>{action}</div>
        <br/>
        <div>Object</div> 
        <div>{objectID}</div>
      </div> 

}

export default TransactionResult;
