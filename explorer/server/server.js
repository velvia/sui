const express = require('express')
const cors = require('cors')
const { exec } = require('child_process')

const app = express()
const port = 4000

app.use(cors())

app.get('/', (req, res) => {
  exec('./target/release/wallet --no-shell addresses', (error, stdout, stderr) => {
          if (error) {
            res.json({message: error.message})
            return;
          }
          if (stderr) {
            res.json({message: stderr})
            return;
          }
          res.json({data: stdout})
  })
});

app.listen(port, () => {
 console.log(`App listening on http://localhost:${port}`)
});
