import styles from './Search.module.scss'

function Search() {
  return (
    <form className={styles.form} action="/" method="get">
      <input
        className={styles.searchtext}
        type="text"
        id="search"
        placeholder="Search transactions by ID" 
        name="txn_id"
      />
      <button type="submit" className={styles.searchbtn}>
        Search
      </button>
    </form>
  )
}

export default Search;
