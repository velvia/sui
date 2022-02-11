const express = require('express')
const { exec } = require('child_process')

const app = express()
const port = 4000

app.get('/', (req, res) => {
  exec('./target/release/wallet --no-shell addresses', (error, stdout, stderr) => {
          if (error) {
            res.end(`{message: ${error.message}`)
            return;
          }
          if (stderr) {
            res.end(`{message: ${stderr}`)
            return;
          }
          res.end(`{data: ${stdout}`)
  })
});

app.listen(port, () => {
 console.log(`App listening on http://localhost:${port}`)
});
