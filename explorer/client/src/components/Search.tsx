function Search() {
  return (
    <form action="/" method="get">
      <input
        type="text"
        id="search"
        placeholder="Search transactions by ID" 
        name="txn_id"
      />
      <button type="submit">
        Search
      </button>
    </form>
  )
}

export default Search;
