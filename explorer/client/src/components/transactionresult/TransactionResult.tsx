import styles from './TransactionResult.module.scss';

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
        <div className={styles.label}>
          Transaction ID
        </div> 
        <div className={styles.result}>
          {data.id}
        </div>
        
        <div className={styles.label}>
          Status
        </div> 
        <div className={styles.result}>
          {data.status}
        </div> 

        <div className={styles.label}>
          Sender
        </div> 
        <div className={styles.result}>
          {data.sender}
        </div>
        
        <div className={styles.label}>
          Did
        </div> 
        <div className={styles.result}>
          {action}
        </div>
        
        <div className={styles.label}>
          Object
        </div> 
        <div className={styles.result}>
        {objectID}
        </div>
      </div> 

}

export default TransactionResult;
